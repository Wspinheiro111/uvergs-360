/**
 * UVERGS 360 — Fixtures compartilhadas das suítes Vitest de isolamento
 *
 * Cria dois tenants e três usuários. A separação em dois tenants é o que
 * torna o Cenário Q verificável: sem um segundo tenant não há como provar
 * que o RLS filtra de verdade.
 */

import postgres from "postgres";

export const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_test_secret@localhost:5433/uvergs360_test";

export const sql = postgres(TEST_DB_URL, { max: 5 });

/** Preenchido por setupFixtures(); lido pelas suítes. */
export const ids = {
  tenantAId: "",
  tenantBId: "",
  userA1Id: "",
  userA2Id: "",
  userB1Id: "",
};

export async function setupFixtures(): Promise<void> {
  const tenants = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES
      ('tenant-a-test', 'Tenant A (Teste)', 'active'),
      ('tenant-b-test', 'Tenant B (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;

  ids.tenantAId = tenants.find((t) => t.slug === "tenant-a-test")?.id;
  ids.tenantBId = tenants.find((t) => t.slug === "tenant-b-test")?.id;

  const users = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES
      (${ids.tenantAId}, 'user-a1@test.uvergs360', 'Usuário A1', 'active'),
      (${ids.tenantAId}, 'user-a2@test.uvergs360', 'Usuário A2', 'active'),
      (${ids.tenantBId}, 'user-b1@test.uvergs360', 'Usuário B1', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;

  ids.userA1Id = users.find((u) => u.email === "user-a1@test.uvergs360")?.id;
  ids.userA2Id = users.find((u) => u.email === "user-a2@test.uvergs360")?.id;
  ids.userB1Id = users.find((u) => u.email === "user-b1@test.uvergs360")?.id;
}

export async function teardownFixtures(): Promise<void> {
  await sql`
    DELETE FROM signed_access_links
    WHERE created_by IN (
      SELECT id FROM users WHERE email LIKE '%@test.uvergs360'
    )
  `;
  await sql`
    DELETE FROM outbox_events
    WHERE tenant_id IN (
      SELECT id FROM tenants WHERE slug LIKE '%-test'
    )
  `;
  await sql`
    DELETE FROM feature_flags
    WHERE tenant_id IN (
      SELECT id FROM tenants WHERE slug LIKE '%-test'
    )
  `;
  await sql`
    DELETE FROM audit_logs
    WHERE tenant_id IN (
      SELECT id FROM tenants WHERE slug LIKE '%-test'
    )
  `;
  await sql`DELETE FROM users WHERE email LIKE '%@test.uvergs360'`;
  await sql`DELETE FROM tenants WHERE slug LIKE '%-test'`;
  await sql.end();
}

/**
 * Abre conexão com tenant_id e user_id injetados na sessão e o role
 * trocado para app_user — reproduz o que o middleware faz antes de cada query.
 *
 * SET não aceita parâmetros bindados, por isso a interpolação é literal.
 * Os valores são sempre UUIDs vindos do próprio banco.
 */
export async function withContext(
  tenantId: string,
  userId: string,
  query: (sql: ReturnType<typeof postgres>) => Promise<unknown>
): Promise<unknown> {
  const ctx = postgres(TEST_DB_URL, { max: 1 });
  try {
    await ctx.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
    await ctx.unsafe(`SET app.current_user_id = '${userId}'`);
    await ctx.unsafe(`SET ROLE app_user`);
    return await query(ctx);
  } finally {
    await ctx.unsafe(`RESET ROLE`);
    await ctx.end();
  }
}
