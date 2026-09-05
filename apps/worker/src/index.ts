/**
 * UVERGS 360 — Worker (BullMQ)
 * W9 Sistemas · v4.2 baseline
 *
 * Processa:
 *   1. Outbox events → filas de domínio
 *   2. Filas de domínio → ações (email, auditoria, certificados)
 *   3. DLQ → alertas operacionais
 *
 * IMPORTANTE: todo processamento de outbox usa service_role (RLS bypass).
 * Nunca usar app_user role no worker.
 */

import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { withServiceRole, serviceDb } from "@uvergs360/db";
import { outboxEvents } from "@uvergs360/db/schema";
import { eq, inArray } from "drizzle-orm";
import { generateCorrelationId } from "@uvergs360/shared";

// =============================================================================
// CONFIGURAÇÃO REDIS
// =============================================================================

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL não configurada para o worker.");
}

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ requer null
  enableReadyCheck: false,
});

// =============================================================================
// DEFINIÇÃO DE FILAS
// =============================================================================

export const QUEUES = {
  OUTBOX_DISPATCHER: "outbox.dispatcher",
  EMAIL_SEND:        "email.send",
  CERTIFICATE_GEN:   "certificate.generate",
  AUDIT_LOG:         "audit.log",
  NOTIFICATION_SEND: "notification.send",
  DLQ:               "dlq.alerts",
} as const;

// Opções padrão de retry com backoff exponencial
const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 1000, // 1s → 2s → 4s → 8s → 16s
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

// Criar filas
export const queues = {
  outboxDispatcher: new Queue(QUEUES.OUTBOX_DISPATCHER, { connection: redis }),
  emailSend:        new Queue(QUEUES.EMAIL_SEND, { connection: redis }),
  certificateGen:   new Queue(QUEUES.CERTIFICATE_GEN, { connection: redis }),
  auditLog:         new Queue(QUEUES.AUDIT_LOG, { connection: redis }),
  notificationSend: new Queue(QUEUES.NOTIFICATION_SEND, { connection: redis }),
  dlq:              new Queue(QUEUES.DLQ, { connection: redis }),
};

// =============================================================================
// PROCESSADOR DE OUTBOX — polling e dispatch
// Roda a cada 2s, busca eventos pendentes e os publica nas filas corretas.
// =============================================================================

export const outboxDispatcher = new Worker(
  QUEUES.OUTBOX_DISPATCHER,
  async (job) => {
    const correlationId = generateCorrelationId();

    log("info", "outbox.dispatch.start", { correlationId, jobId: job.id });

    await withServiceRole(async (db) => {
      // Buscar até 50 eventos pendentes ordenados por prioridade e criação
      const pending = await db
        .select()
        .from(outboxEvents)
        .where(inArray(outboxEvents.status, ["pending", "failed"]))
        .orderBy(outboxEvents.priority, outboxEvents.createdAt)
        .limit(50);

      if (pending.length === 0) return;

      log("info", "outbox.dispatch.found", {
        correlationId,
        count: pending.length,
      });

      for (const event of pending) {
        try {
          // Marcar como "processing" antes de publicar (evita double-dispatch)
          await db
            .update(outboxEvents)
            .set({ status: "processing", lastAttemptAt: new Date() })
            .where(eq(outboxEvents.id, event.id));

          // Publicar na fila correta com idempotency key
          const targetQueue = queues[event.targetQueue as keyof typeof queues];
          if (!targetQueue) {
            throw new Error(`Fila desconhecida: ${event.targetQueue}`);
          }

          await targetQueue.add(
            event.eventType,
            {
              ...event.payload,
              outboxEventId: event.id,
              tenantId: event.tenantId,
              correlationId,
            },
            {
              ...DEFAULT_JOB_OPTIONS,
              jobId: event.idempotencyKey, // idempotency no nível da fila
            }
          );

          // Marcar como done
          await db
            .update(outboxEvents)
            .set({ status: "done", processedAt: new Date() })
            .where(eq(outboxEvents.id, event.id));

        } catch (error) {
          const attempts = Number(event.attempts) + 1;
          const maxAttempts = Number(event.maxAttempts);
          const newStatus = attempts >= maxAttempts ? "dead_letter" : "failed";

          await db
            .update(outboxEvents)
            .set({
              status: newStatus,
              attempts: String(attempts),
              lastError: error instanceof Error ? error.message : String(error),
              lastAttemptAt: new Date(),
            })
            .where(eq(outboxEvents.id, event.id));

          // Alertar DLQ quando morto
          if (newStatus === "dead_letter") {
            await queues.dlq.add("outbox.dead_letter", {
              outboxEventId: event.id,
              tenantId: event.tenantId,
              eventType: event.eventType,
              error: error instanceof Error ? error.message : String(error),
              attempts,
              correlationId,
            });
          }

          log("error", "outbox.dispatch.error", {
            correlationId,
            outboxEventId: event.id,
            status: newStatus,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    });
  },
  { connection: redis, concurrency: 1 }
);

// =============================================================================
// PROCESSADOR DE EMAIL
// =============================================================================

export const emailWorker = new Worker(
  QUEUES.EMAIL_SEND,
  async (job) => {
    const correlationId = job.data.correlationId ?? generateCorrelationId();
    log("info", "email.send.start", { correlationId, jobId: job.id });

    // TODO(#59): chamar ResendEmailAdapter.sendTemplate()
    // A implementação completa é feita após o Resend estar configurado
    log("info", "email.send.done", { correlationId, jobId: job.id });
  },
  { connection: redis, concurrency: 5 }
);

// =============================================================================
// PROCESSADOR DE AUDITORIA
// Grava no audit_logs via service_role (append-only).
// =============================================================================

export const auditWorker = new Worker(
  QUEUES.AUDIT_LOG,
  async (job) => {
    const { data } = job;
    await withServiceRole(async (db) => {
      // TODO(#60): INSERT em audit_logs via service_role
      // Implementação completa em F0/audit
      log("info", "audit.log.written", {
        action: data.action,
        entityId: data.entityId,
        correlationId: data.correlationId,
      });
    });
  },
  { connection: redis, concurrency: 10 }
);

// =============================================================================
// DLQ — ALERTAS OPERACIONAIS
// Toda mensagem que chega aqui deve gerar alerta para a equipe.
// =============================================================================

export const dlqWorker = new Worker(
  QUEUES.DLQ,
  async (job) => {
    const correlationId = job.data.correlationId ?? generateCorrelationId();

    // Log crítico
    log("error", "dlq.alert", {
      correlationId,
      jobName: job.name,
      data: job.data,
    });

    // TODO(#61): notificar via Slack / email quando integração estiver configurada
    // Prioridade: crítico — o sistema parou de processar este evento
  },
  { connection: redis, concurrency: 1 }
);

// =============================================================================
// SCHEDULER — dispara o outbox dispatcher periodicamente
// =============================================================================

async function startOutboxScheduler() {
  // Repetir a cada 2 segundos
  await queues.outboxDispatcher.add(
    "poll",
    {},
    {
      repeat: { every: 2000 },
      removeOnComplete: true,
    }
  );
  log("info", "worker.scheduler.started", { interval: "2s" });
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown() {
  log("info", "worker.shutdown.start", {});
  await Promise.all([
    outboxDispatcher.close(),
    emailWorker.close(),
    auditWorker.close(),
    dlqWorker.close(),
  ]);
  await redis.quit();
  log("info", "worker.shutdown.done", {});
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// =============================================================================
// LOG ESTRUTURADO
// =============================================================================

function log(level: "info" | "error" | "warn", event: string, data: object) {
  console[level === "error" ? "error" : "log"](
    JSON.stringify({
      level,
      event,
      ...data,
      timestamp: new Date().toISOString(),
    })
  );
}

// =============================================================================
// START
// =============================================================================

async function main() {
  log("info", "worker.start", { queues: Object.values(QUEUES) });
  await startOutboxScheduler();
  log("info", "worker.ready", { pid: process.pid });
}

main().catch((err) => {
  console.error("Worker fatal error:", err);
  process.exit(1);
});
