/**
 * Nível 3 — Isolamento de Pessoa (Cenário K/L)
 *
 * Fronteira Câmara × Pessoa e escopo dos signed access links.
 */

import { test, expect } from "../../helpers/harness.mjs";

export async function runLevel3({ sql, withContext, tenantAId, tenantBId, userA1Id, userA2Id, userB1Id }) {
  console.log("\n📋 Nível 3 — Isolamento de Pessoa (Fundação)\n");

  await test("Usuário acessa apenas dados do próprio tenant", async () => {
    const result = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT id FROM users WHERE tenant_id = ${tenantBId}`
    );
    expect(result).toHaveLength(0);
  });

  await test("is_service_role() retorna FALSE para app_user", async () => {
    const [row] = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT app.is_service_role() AS is_svc`
    );
    if (row.is_svc !== false) throw new Error(`is_service_role() retornou ${row.is_svc} para app_user`);
  });

  await test("Signed access link não permite acesso cross-tenant", async () => {
    const [link] = await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (
        ${tenantAId},
        'test-nonce-' || gen_random_uuid()::text,
        'chamber:read:test',
        ${userA1Id},
        NOW() + INTERVAL '1 hour'
      )
      RETURNING id
    `;

    const result = await withContext(tenantBId, userB1Id, async (ctx) =>
      ctx`SELECT * FROM signed_access_links WHERE id = ${link.id}`
    );
    expect(result).toHaveLength(0);

    await sql`DELETE FROM signed_access_links WHERE id = ${link.id}`;
  });

  await test("Notificações: usuário A1 não vê notificações de A2", async () => {
    // Inserir notificação para A2
    const [notif] = await sql`
      INSERT INTO notifications (tenant_id, user_id, type, title)
      VALUES (${tenantAId}, ${userA2Id}, 'test.notif', 'Notificação privada de A2')
      RETURNING id
    `;

    // A1 tenta ler — a política exige user_id = current_user_id()
    const result = await withContext(tenantAId, userA1Id, async (ctx) =>
      ctx`SELECT * FROM notifications WHERE id = ${notif.id}`
    );
    expect(result).toHaveLength(0);

    await sql`DELETE FROM notifications WHERE id = ${notif.id}`;
  });
}

