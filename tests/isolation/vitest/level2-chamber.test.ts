/**
 * UVERGS 360 — Nível 2 — Isolamento de Câmara (Cenário F)
 *
 * Obrigatório no CI (§19.3 v4.2): deve passar antes de qualquer
 * funcionalidade de produto entrar em produção.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, ids, setupFixtures, teardownFixtures, withContext } from "./fixtures";

beforeAll(setupFixtures);
afterAll(teardownFixtures);

describe("Nível 2 — Isolamento de Câmara (Fundação)", () => {
  it("Contexto de usuário é injetado corretamente na sessão", async () => {
    const result = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`
        SELECT
          app.current_tenant_id() AS tenant_id,
          app.current_user_id() AS user_id
      `
    ) as any[];

    expect(result[0]?.tenant_id).toBe(ids.tenantAId);
    expect(result[0]?.user_id).toBe(ids.userA1Id);
  });

  it("app_user não pode modificar audit_logs (append-only)", async () => {
    // Primeiro, inserir um log via service_role (correto)
    const [inserted] = await sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id,
        action, module, entity_type, entity_id, outcome
      )
      VALUES (
        ${ids.tenantAId}, ${ids.userA1Id}, gen_random_uuid(),
        'test.isolation.check', 'platform', 'User', ${ids.userA1Id}, 'success'
      )
      RETURNING id
    `;

    // Tentar UPDATE como app_user → deve falhar (política RLS proíbe UPDATE)
    await expect(
      withContext(ids.tenantAId, ids.userA1Id, async (ctxSql) => ctxSql`
        UPDATE audit_logs SET outcome = 'failure' WHERE id = ${inserted.id}
      `)
    ).rejects.toThrow();

    // Tentar DELETE como app_user → deve falhar
    await expect(
      withContext(ids.tenantAId, ids.userA1Id, async (ctxSql) => ctxSql`
        DELETE FROM audit_logs WHERE id = ${inserted.id}
      `)
    ).rejects.toThrow();

    // Confirmar que o registro permanece íntegro
    const [original] = await sql`
      SELECT outcome FROM audit_logs WHERE id = ${inserted.id}
    `;
    expect(original.outcome).toBe("success"); // não foi alterado

    // Limpeza (service_role pode deletar em ambiente de teste)
    await sql`DELETE FROM audit_logs WHERE id = ${inserted.id}`;
  });

  it("Outbox: idempotency_key UNIQUE impede duplicação", async () => {
    const key = `test-idempotency-${Date.now()}`;

    // Primeiro insert: sucesso
    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${ids.tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'certificate.generate')
    `;

    // Segundo insert com mesma chave: deve falhar
    await expect(sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${ids.tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'certificate.generate')
    `).rejects.toThrow(/duplicate key/i);

    // Limpeza
    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });
});

// =============================================================================
// NÍVEL 3 — ISOLAMENTO DE PESSOA (Cenário K/L — fronteira Câmara × Pessoa)
// Expandido em F1 quando Person e Chamber existirem.
// =============================================================================
