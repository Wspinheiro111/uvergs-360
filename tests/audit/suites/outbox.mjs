/**
 * Outbox — padrão transactional outbox e idempotência
 *
 * Verifica a transição de estado, o dead-letter após tentativas
 * esgotadas e o trigger de updated_at.
 */

import { test } from "../../helpers/harness.mjs";

export async function runOutboxTests({ sql, tenantId }) {
  console.log("\n📋 Outbox — Transacional e Idempotência\n");

  await test("Outbox grava payload JSON complexo", async () => {
    const key = `test-payload-${Date.now()}`;
    const payload = {
      registrationId: "abc-123",
      eventId: "evt-456",
      participants: [{ id: "p1", name: "João" }, { id: "p2", name: "Maria" }],
      totalAmount: 15000,
      currency: "BRL"
    };

    const [row] = await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Registration', gen_random_uuid(), 'registration.confirmed', ${sql.json(payload)}, ${key}, 'emailSend')
      RETURNING id, payload, status`;

    if (row.payload.registrationId !== "abc-123") throw new Error("payload JSON incorreto");
    if (row.status !== "pending") throw new Error(`status inicial incorreto: ${row.status}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Status do outbox transita pending → processing → done", async () => {
    const key = `test-transition-${Date.now()}`;

    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.event', '{}', ${key}, 'emailSend')`;

    // pending → processing
    await sql`UPDATE outbox_events SET status = 'processing', last_attempt_at = NOW() WHERE idempotency_key = ${key}`;
    const [proc] = await sql`SELECT status FROM outbox_events WHERE idempotency_key = ${key}`;
    if (proc.status !== "processing") throw new Error("Transição para processing falhou");

    // processing → done
    await sql`UPDATE outbox_events SET status = 'done', processed_at = NOW() WHERE idempotency_key = ${key}`;
    const [done] = await sql`SELECT status FROM outbox_events WHERE idempotency_key = ${key}`;
    if (done.status !== "done") throw new Error("Transição para done falhou");

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Outbox dead_letter após tentativas esgotadas", async () => {
    const key = `test-dlq-${Date.now()}`;

    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue, max_attempts)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.fail', '{}', ${key}, 'emailSend', 3)`;

    // Simular 3 tentativas com falha
    for (let i = 1; i <= 3; i++) {
      const newStatus = i >= 3 ? "dead_letter" : "failed";
      await sql`UPDATE outbox_events SET status = ${newStatus}, attempts = ${i}, last_error = 'Connection refused' WHERE idempotency_key = ${key}`;
    }

    const [final] = await sql`SELECT status, attempts FROM outbox_events WHERE idempotency_key = ${key}`;
    if (final.status !== "dead_letter") throw new Error(`Status final incorreto: ${final.status}`);
    if (final.attempts !== 3) throw new Error(`Tentativas incorretas: ${final.attempts}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("updated_at atualiza automaticamente via trigger", async () => {
    const key = `test-trigger-${Date.now()}`;
    const [before] = await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.trigger', '{}', ${key}, 'emailSend')
      RETURNING updated_at`;

    await new Promise(r => setTimeout(r, 50)); // garantir diferença de tempo

    await sql`UPDATE outbox_events SET status = 'processing' WHERE idempotency_key = ${key}`;
    const [after] = await sql`SELECT updated_at FROM outbox_events WHERE idempotency_key = ${key}`;

    if (after.updated_at <= before.updated_at) throw new Error("updated_at não foi atualizado pelo trigger");

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Prioridade high é indexada e consultável", async () => {
    const key = `test-priority-${Date.now()}`;
    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue, priority)
      VALUES (${tenantId}, 'Payment', gen_random_uuid(), 'payment.confirmed', '{}', ${key}, 'emailSend', 'high')`;

    const [row] = await sql`SELECT priority FROM outbox_events WHERE idempotency_key = ${key}`;
    if (row.priority !== "high") throw new Error(`Prioridade incorreta: ${row.priority}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });
}

