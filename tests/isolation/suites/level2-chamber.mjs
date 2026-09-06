/**
 * Nível 2 — Isolamento de Câmara (Cenário F) e integridade da auditoria
 *
 * Cobre a fundação que F1 usará: injeção de contexto na sessão,
 * auditoria append-only e idempotência do outbox.
 */

import { test, expect } from "../../helpers/harness.mjs";

export async function runLevel2({ sql, withContext, tenantAId, tenantBId, userA1Id }) {
  console.log("\n📋 Nível 2 — Isolamento de Câmara (Fundação)\n");

  await test("Contexto de usuário injetado corretamente na sessão", async () => {
    const [row] = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT app.current_tenant_id() AS tid, app.current_user_id() AS uid`
    );
    expect(row.tid).toBe(tenantAId);
    expect(row.uid).toBe(userA1Id);
  });

  await test("app_user NÃO pode UPDATE em audit_logs (append-only)", async () => {
    // Inserir log via superuser (simula service_role)
    const [inserted] = await sql`
      INSERT INTO audit_logs (tenant_id, user_id, correlation_id, action, module, entity_type, entity_id, outcome)
      VALUES (${tenantAId}, ${userA1Id}, gen_random_uuid(), 'test.isolation', 'platform', 'User', ${userA1Id}, 'success')
      RETURNING id
    `;

    let rejeitou = false;
    try {
      await withContext(tenantAId, userA1Id, async (ctx) =>
        ctx`UPDATE audit_logs SET outcome = 'failure' WHERE id = ${inserted.id}`
      );
    } catch (e) {
      rejeitou = true;
    }
    if (!rejeitou) throw new Error("app_user conseguiu UPDATE em audit_logs — FALHA DE SEGURANÇA");

    // Confirmar integridade
    const [original] = await sql`SELECT outcome FROM audit_logs WHERE id = ${inserted.id}`;
    expect(original.outcome).toBe("success");

    // Limpeza
    await sql`DELETE FROM audit_logs WHERE id = ${inserted.id}`;
  });

  await test("app_user NÃO pode DELETE em audit_logs (append-only)", async () => {
    const [inserted] = await sql`
      INSERT INTO audit_logs (tenant_id, user_id, correlation_id, action, module, entity_type, entity_id, outcome)
      VALUES (${tenantAId}, ${userA1Id}, gen_random_uuid(), 'test.delete.check', 'platform', 'User', ${userA1Id}, 'success')
      RETURNING id
    `;

    let rejeitou = false;
    try {
      await withContext(tenantAId, userA1Id, async (ctx) =>
        ctx`DELETE FROM audit_logs WHERE id = ${inserted.id}`
      );
    } catch (e) {
      rejeitou = true;
    }
    if (!rejeitou) throw new Error("app_user conseguiu DELETE em audit_logs — FALHA DE SEGURANÇA");

    // Confirmar que registro existe
    const [still] = await sql`SELECT id FROM audit_logs WHERE id = ${inserted.id}`;
    if (!still) throw new Error("Registro foi deletado mesmo após rejeição");

    await sql`DELETE FROM audit_logs WHERE id = ${inserted.id}`;
  });

  await test("Outbox: idempotency_key UNIQUE impede duplicação", async () => {
    const key = `test-idempotency-${Date.now()}`;

    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'emailSend')
    `;

    let rejeitou = false;
    try {
      await sql`
        INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
        VALUES (${tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'emailSend')
      `;
    } catch (e) {
      if (e.message.toLowerCase().includes('unique') || e.message.toLowerCase().includes('duplicate')) {
        rejeitou = true;
      } else {
        throw e;
      }
    }
    if (!rejeitou) throw new Error("Segundo INSERT com mesmo idempotency_key deveria ter falhado");

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Outbox: INSERT de app_user só aceita tenant_id do próprio contexto", async () => {
    const key = `test-outbox-ctx-${Date.now()}`;
    let rejeitou = false;
    try {
      await withContext(tenantAId, userA1Id, async (ctx) =>
        ctx`
          INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
          VALUES (${tenantBId}, 'Test', gen_random_uuid(), 'test', '{}', ${key}, 'emailSend')
        `
      );
    } catch (e) {
      rejeitou = true;
    }
    if (!rejeitou) throw new Error("app_user inseriu outbox com tenant_id diferente");
  });
}

