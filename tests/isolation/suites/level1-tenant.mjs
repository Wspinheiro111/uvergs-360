/**
 * Nível 1 — Isolamento de Tenant × Tenant (Cenário Q, §19.3 v4.2)
 *
 * Verifica que o RLS impede qualquer leitura ou escrita entre tenants.
 */

import { test, expect } from "../../helpers/harness.mjs";

export async function runLevel1({ sql, withContext, tenantAId, tenantBId, userA1Id, userB1Id }) {
  console.log("\n📋 Nível 1 — Isolamento de Tenant (Cenário Q)\n");

  await test("Tenant A não lê registros do Tenant B via RLS", async () => {
    await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, description)
      VALUES (${tenantBId}, 'TEST_FLAG_B_ONLY', false, 'Flag exclusiva do Tenant B')
      ON CONFLICT (tenant_id, key) DO NOTHING
    `;

    const result = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT * FROM feature_flags WHERE key = 'TEST_FLAG_B_ONLY'`
    );

    expect(result).toHaveLength(0);
  });

  await test("Tenant B não lê usuários do Tenant A", async () => {
    const result = await withContext(tenantBId, userB1Id, async (ctx) =>
      ctx`SELECT * FROM users WHERE tenant_id = ${tenantAId}`
    );
    expect(result).toHaveLength(0);
  });

  await test("Tenant A não pode INSERT com tenant_id do Tenant B", async () => {
    let rejeitou = false;
    try {
      await withContext(tenantAId, userA1Id, async (ctx) =>
        ctx`
          INSERT INTO feature_flags (tenant_id, key, enabled, description)
          VALUES (${tenantBId}, 'INJECTION_ATTEMPT', true, 'Cross-tenant injection')
        `
      );
    } catch {
      rejeitou = true;
    }
    if (!rejeitou) throw new Error("Deveria ter rejeitado o INSERT cross-tenant");
  });

  await test("Cenário Q: current_tenant_id() reflete contexto correto", async () => {
    const [rowA] = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT app.current_tenant_id() AS tenant_id`
    );
    expect(rowA.tenant_id).toBe(tenantAId);

    const [rowB] = await withContext(tenantBId, userB1Id, async (ctx) =>
      ctx`SELECT app.current_tenant_id() AS tenant_id`
    );
    expect(rowB.tenant_id).toBe(tenantBId);
    if (rowB.tenant_id === tenantAId) throw new Error("Tenant B viu contexto do Tenant A");
  });

  await test("Contagem cross-tenant retorna 0 (RLS filtra silenciosamente)", async () => {
    const [row] = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT COUNT(*) AS count FROM users WHERE tenant_id = ${tenantBId}`
    );
    expect(parseInt(row.count)).toBe(0);
  });
}

