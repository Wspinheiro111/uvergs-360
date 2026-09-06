/**
 * UVERGS 360 — Nível 3 — Isolamento de Pessoa (Cenário K/L)
 *
 * Obrigatório no CI (§19.3 v4.2): deve passar antes de qualquer
 * funcionalidade de produto entrar em produção.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, ids, setupFixtures, teardownFixtures, withContext } from "./fixtures";

beforeAll(setupFixtures);
afterAll(teardownFixtures);

describe("Nível 3 — Isolamento de Pessoa (Fundação)", () => {
  it("Usuário acessa apenas dados do próprio tenant", async () => {
    // Usuário do Tenant A não vê usuários do Tenant B
    const result = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`
        SELECT id FROM users WHERE tenant_id = ${ids.tenantBId}
      `
    ) as any[];

    expect(result).toHaveLength(0);
  });

  it("is_service_role() retorna FALSE para app_user", async () => {
    const result = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`SELECT app.is_service_role() AS is_service`
    ) as any[];

    expect(result[0]?.is_service).toBe(false);
  });

  it("Signed access link não permite acesso cross-tenant", async () => {
    // Criar um link para Tenant A
    const [link] = await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (
        ${ids.tenantAId},
        'test-nonce-isolation-' || gen_random_uuid()::text,
        'chamber:read:test',
        ${ids.userA1Id},
        NOW() + INTERVAL '1 hour'
      )
      RETURNING id, tenant_id
    `;

    // Tenant B tentando ler o link do Tenant A → deve retornar 0 (RLS)
    const result = await withContext(
      ids.tenantBId,
      ids.userB1Id,
      async (ctxSql) => ctxSql`
        SELECT * FROM signed_access_links WHERE id = ${link.id}
      `
    ) as any[];

    expect(result).toHaveLength(0);

    // Limpeza
    await sql`DELETE FROM signed_access_links WHERE id = ${link.id}`;
  });
});

// =============================================================================
// RLS GERAL — Verificações de configuração
// =============================================================================
