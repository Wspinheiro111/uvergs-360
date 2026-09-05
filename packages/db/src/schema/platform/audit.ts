import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  inet,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant.ts";

// =============================================================================
// AUDIT LOG — registro append-only de toda ação crítica
//
// Regras (§11, §16.5 v4.2):
//   - Nenhum usuário comum pode editar ou deletar
//   - Apenas service_role pode inserir (via middleware de auditoria)
//   - Tabela particionada por created_at (partições mensais)
//   - Retida pelo período definido na política de retenção
// =============================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Contexto de isolamento
    tenantId: uuid("tenant_id").notNull(), // sem FK para performance em partição
    chamberId: uuid("chamber_id"),         // null quando ação é de escopo tenant
    personId: uuid("person_id"),           // null quando não é ação pessoal

    // Ator
    userId: uuid("user_id").notNull(),     // quem executou
    userEmail: text("user_email"),         // desnormalizado para consulta histórica
    userDisplayName: text("user_display_name"), // idem

    // Rastreabilidade
    correlationId: uuid("correlation_id").notNull(), // ID da requisição HTTP
    sessionId: uuid("session_id"),         // sessão autenticada

    // Ação
    action: text("action").notNull(),      // ex: "finance.payment.manual_settle"
    module: text("module").notNull(),      // ex: "financial"
    entityType: text("entity_type").notNull(), // ex: "Receivable"
    entityId: uuid("entity_id").notNull(),

    // Mudança de estado
    previousValue: jsonb("previous_value"), // estado anterior serializado
    newValue: jsonb("new_value"),           // estado posterior serializado

    // Contexto adicional
    justification: text("justification"),  // obrigatório em ações críticas
    metadata: jsonb("metadata"),            // dados extras específicos da ação

    // Rede
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),

    // Resultado
    outcome: text("outcome", { enum: ["success", "failure", "partial"] })
      .notNull()
      .default("success"),
    errorMessage: text("error_message"),    // apenas se outcome = failure

    // Timestamp — imutável após inserção
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Índices para consulta de auditoria
    tenantCreatedAtIdx: index("audit_logs_tenant_created_at_idx").on(
      t.tenantId,
      t.createdAt
    ),
    entityIdx: index("audit_logs_entity_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt
    ),
    userIdx: index("audit_logs_user_idx").on(t.userId, t.createdAt),
    correlationIdx: index("audit_logs_correlation_idx").on(t.correlationId),
    actionIdx: index("audit_logs_action_idx").on(t.tenantId, t.action),
    chamberIdx: index("audit_logs_chamber_idx").on(t.chamberId, t.createdAt),
  })
);
// ATENÇÃO: particionamento por created_at é aplicado via migration SQL direta
// (não suportado diretamente pelo Drizzle schema — ver migration 0006)

// =============================================================================
// PERSONAL DATA ACCESS LOG — rastreamento de acesso a dados pessoais sensíveis
// Exigido pela LGPD para dados de maior sensibilidade (§16.4 v4.2)
// =============================================================================

export const personalDataAccessLogs = pgTable(
  "personal_data_access_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    // Quem acessou
    userId: uuid("user_id").notNull(),
    userRole: text("user_role"),

    // O que foi acessado
    dataCategory: text("data_category").notNull(),
    // Ex: "cpf", "contact_personal", "health_data", "financial_personal"
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),

    // Por quê foi acessado
    purpose: text("purpose").notNull(),    // finalidade da consulta
    legalBasis: text("legal_basis"),       // base legal aplicável

    // Contexto
    correlationId: uuid("correlation_id").notNull(),
    ipAddress: inet("ip_address"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantCreatedAtIdx: index("personal_data_access_logs_tenant_idx").on(
      t.tenantId,
      t.createdAt
    ),
    entityIdx: index("personal_data_access_logs_entity_idx").on(
      t.entityType,
      t.entityId
    ),
    userIdx: index("personal_data_access_logs_user_idx").on(t.userId),
  })
);

// =============================================================================
// OUTBOX EVENTS — transactional outbox pattern
// Gravado NA MESMA TRANSAÇÃO do evento de domínio.
// Worker lê e publica na fila APÓS confirmar o commit.
// Idempotency key impede processamento duplicado.
// =============================================================================

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    // Identificação do agregado de domínio
    aggregateType: text("aggregate_type").notNull(), // ex: "Registration"
    aggregateId: uuid("aggregate_id").notNull(),

    // Tipo do evento
    eventType: text("event_type").notNull(),          // ex: "registration.confirmed"

    // Payload serializado
    payload: jsonb("payload").notNull(),

    // Chave de idempotência — UNIQUE — impede duplicação mesmo em retry
    idempotencyKey: text("idempotency_key").notNull(),

    // Estado de processamento
    status: text("status", {
      enum: ["pending", "processing", "done", "failed", "dead_letter"],
    })
      .notNull()
      .default("pending"),

    attempts: text("attempts").notNull().default("0"),
    maxAttempts: text("max_attempts").notNull().default("5"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),

    // Prioridade de processamento
    priority: text("priority", { enum: ["high", "normal", "low"] })
      .notNull()
      .default("normal"),

    // Fila de destino no BullMQ
    targetQueue: text("target_queue").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // UNIQUE na idempotency_key — fundamental para exatamente-uma-vez
    idempotencyKeyUnique: index("outbox_idempotency_unique").on(
      t.idempotencyKey
    ),
    // Índice para o worker buscar eventos pendentes
    pendingIdx: index("outbox_pending_idx").on(
      t.status,
      t.priority,
      t.createdAt
    ),
    tenantIdx: index("outbox_tenant_idx").on(t.tenantId),
    aggregateIdx: index("outbox_aggregate_idx").on(
      t.aggregateType,
      t.aggregateId
    ),
  })
);

// =============================================================================
// NOTIFICATIONS — notificações internas do sistema (§30 v4.2)
// =============================================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),

    type: text("type").notNull(),
    // Ex: "task.overdue", "ticket.new", "payment.reconciled",
    //     "integration.failure", "suspicious_login", "dlq.alert"

    severity: text("severity", {
      enum: ["info", "warning", "error", "critical"],
    })
      .notNull()
      .default("info"),

    title: text("title").notNull(),
    body: text("body"),

    // Link de ação (interno ou externo)
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),

    // Referência à entidade relacionada
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),

    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUnreadIdx: index("notifications_user_unread_idx").on(
      t.userId,
      t.readAt,
      t.createdAt
    ),
    tenantIdx: index("notifications_tenant_idx").on(t.tenantId),
    severityIdx: index("notifications_severity_idx").on(
      t.tenantId,
      t.severity,
      t.createdAt
    ),
  })
);

// =============================================================================
// FILE ASSETS — metadados de arquivos armazenados no object storage
// =============================================================================

export const fileAssets = pgTable(
  "file_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    // Chave no object storage
    storageKey: text("storage_key").notNull(),
    bucket: text("bucket").notNull(), // "uvergs360-private" | "uvergs360-public"

    // Metadados do arquivo
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: text("size_bytes").notNull(), // bigint como text para JS safety
    checksumSha256: text("checksum_sha256").notNull(),

    // Categoria para organização
    category: text("category").notNull(),
    // Ex: "certificate", "commitment", "event_material", "profile_avatar"

    // Referência à entidade dona do arquivo
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),

    // Scan antivírus (para uploads de usuário externo)
    virusScanStatus: text("virus_scan_status", {
      enum: ["pending", "clean", "infected", "error", "skipped"],
    })
      .notNull()
      .default("pending"),
    virusScanAt: timestamp("virus_scan_at", { withTimezone: true }),

    // Upload por
    uploadedBy: uuid("uploaded_by"),
    uploadedByRole: text("uploaded_by_role"),

    // Soft delete — nunca hard delete de arquivo referenciado
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    storageKeyUnique: index("file_assets_storage_key_unique").on(t.storageKey),
    tenantIdx: index("file_assets_tenant_idx").on(t.tenantId),
    entityIdx: index("file_assets_entity_idx").on(t.entityType, t.entityId),
    categoryIdx: index("file_assets_category_idx").on(t.tenantId, t.category),
  })
);

// =============================================================================
// USAGE METER — medição de consumo e custo por fornecedor/canal (§12.5 v4.2)
// Todo serviço tarifado alimenta esta tabela.
// Tetos configuráveis + bloqueio preventivo.
// =============================================================================

export const usageMeters = pgTable(
  "usage_meters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    // Fornecedor/canal
    provider: text("provider").notNull(),
    // Ex: "whatsapp", "sms", "email", "ocr", "openai", "resend"
    channel: text("channel"),              // sub-canal se aplicável

    // Período de apuração
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    // Consumo
    unit: text("unit").notNull(),          // "message", "token", "page", "api_call"
    quantityUsed: text("quantity_used").notNull().default("0"),
    quantityLimit: text("quantity_limit"), // null = sem limite configurado

    // Custo (em centavos para evitar float)
    estimatedCostCents: text("estimated_cost_cents").notNull().default("0"),
    actualCostCents: text("actual_cost_cents"),

    // Status de alerta
    alertStatus: text("alert_status", {
      enum: ["normal", "warning_80pct", "critical_95pct", "blocked"],
    })
      .notNull()
      .default("normal"),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    blockedReason: text("blocked_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantProviderPeriodIdx: index("usage_meters_tenant_provider_period_idx").on(
      t.tenantId,
      t.provider,
      t.periodStart
    ),
    alertStatusIdx: index("usage_meters_alert_status_idx").on(
      t.tenantId,
      t.alertStatus
    ),
  })
);

// =============================================================================
// SECURITY INCIDENTS — registro de incidentes de segurança
// =============================================================================

export const securityIncidents = pgTable(
  "security_incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull(),

    title: text("title").notNull(),
    description: text("description").notNull(),

    severity: text("severity", {
      enum: ["low", "medium", "high", "critical"],
    }).notNull(),

    status: text("status", {
      enum: [
        "detected",
        "investigating",
        "contained",
        "remediated",
        "closed",
      ],
    })
      .notNull()
      .default("detected"),

    // Timeline
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    containedAt: timestamp("contained_at", { withTimezone: true }),
    remediatedAt: timestamp("remediated_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),

    // Evidências e comunicações
    evidences: jsonb("evidences"),          // lista de evidências coletadas
    affectedEntities: jsonb("affected_entities"), // entidades impactadas
    communications: jsonb("communications"), // log de comunicações a titulares/autoridade
    remediationSteps: jsonb("remediation_steps"),

    // Responsável pelo incidente
    assignedTo: uuid("assigned_to"),
    reportedBy: uuid("reported_by"),

    // LGPD: notificação à ANPD quando aplicável
    anpdNotificationRequired: text("anpd_notification_required", {
      enum: ["yes", "no", "under_evaluation"],
    }).default("under_evaluation"),
    anpdNotifiedAt: timestamp("anpd_notified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("security_incidents_tenant_idx").on(t.tenantId),
    statusIdx: index("security_incidents_status_idx").on(t.tenantId, t.status),
    severityIdx: index("security_incidents_severity_idx").on(
      t.severity,
      t.detectedAt
    ),
  })
);
