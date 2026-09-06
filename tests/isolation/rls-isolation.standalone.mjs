/**
 * UVERGS 360 — Testes de Isolamento RLS (runner)
 *
 * Cobre os 3 níveis independentes de isolamento (§19.3 v4.2):
 *   L1 — Tenant × Tenant      (Cenário Q)  → suites/level1-tenant.mjs
 *   L2 — Câmara × Câmara      (Cenário F)  → suites/level2-chamber.mjs
 *   L3 — Pessoa × Pessoa      (Cenário K)  → suites/level3-person.mjs
 *   RLS — configuração do banco             → suites/rls-config.mjs
 *
 * Executar: node tests/isolation/rls-isolation.standalone.mjs
 */

import postgres from "postgres";
import {
  makeWithContext,
  printHeader,
  reportAndExit,
} from "../helpers/harness.mjs";
import { runLevel1 } from "./suites/level1-tenant.mjs";
import { runLevel2 } from "./suites/level2-chamber.mjs";
import { runLevel3 } from "./suites/level3-person.mjs";
import { runRLSConfig } from "./suites/rls-config.mjs";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test";

const sql = postgres(DB_URL, { max: 5 });
const withContext = makeWithContext(DB_URL);

// ─── Fixtures ────────────────────────────────────────────────────────────

/**
 * Cria dois tenants e três usuários. A separação em dois tenants é o que
 * torna o Cenário Q verificável: sem um segundo tenant não há como provar
 * que o RLS filtra.
 */
async function setup() {
  console.log("\n🔧 Setup — criando dados de teste...\n");

  const tenants = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES
      ('tenant-a-test', 'Tenant A (Teste)', 'active'),
      ('tenant-b-test', 'Tenant B (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;

  const users = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES
      (${tenants.find((t) => t.slug === "tenant-a-test").id}, 'user-a1@test.internal', 'Usuário A1', 'active'),
      (${tenants.find((t) => t.slug === "tenant-a-test").id}, 'user-a2@test.internal', 'Usuário A2', 'active'),
      (${tenants.find((t) => t.slug === "tenant-b-test").id}, 'user-b1@test.internal', 'Usuário B1', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;

  const ctx = {
    sql,
    withContext,
    tenantAId: tenants.find((t) => t.slug === "tenant-a-test").id,
    tenantBId: tenants.find((t) => t.slug === "tenant-b-test").id,
    userA1Id: users.find((u) => u.email === "user-a1@test.internal").id,
    userA2Id: users.find((u) => u.email === "user-a2@test.internal").id,
    userB1Id: users.find((u) => u.email === "user-b1@test.internal").id,
  };

  console.log(`  Tenant A: ${ctx.tenantAId}`);
  console.log(`  Tenant B: ${ctx.tenantBId}`);
  console.log(`  User A1:  ${ctx.userA1Id}`);
  console.log(`  User B1:  ${ctx.userB1Id}`);

  return ctx;
}

async function teardown() {
  await sql`DELETE FROM outbox_events WHERE idempotency_key LIKE 'test-%'`;
  await sql`DELETE FROM signed_access_links WHERE scope = 'chamber:read:test'`;
  await sql`DELETE FROM feature_flags WHERE key LIKE 'TEST_%' OR key = 'INJECTION_ATTEMPT'`;
  await sql`DELETE FROM users WHERE email LIKE '%@test.internal'`;
  await sql`DELETE FROM tenants WHERE slug LIKE '%-test'`;
}

// ─── Runner ──────────────────────────────────────────────────────────────

async function main() {
  printHeader(
    "UVERGS 360 — Testes de Isolamento RLS",
    "W9 Sistemas · Gate F0"
  );

  try {
    const ctx = await setup();
    await runLevel1(ctx);
    await runLevel2(ctx);
    await runLevel3(ctx);
    await runRLSConfig(ctx);
  } finally {
    console.log("\n🧹 Teardown...");
    await teardown();
    await sql.end();
  }

  reportAndExit(
    "Isolamento",
    "Todos os testes de isolamento passaram — Gate F0 RLS: GO"
  );
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
