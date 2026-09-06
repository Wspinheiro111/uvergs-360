/**
 * UVERGS 360 — Testes de Auditoria, Outbox e Autenticação (runner)
 *
 * Gate F0: auditoria append-only, outbox transacional com idempotência,
 * proteção contra brute force e signed access links.
 *
 * Executar: node tests/audit/audit.standalone.mjs
 */

import postgres from "postgres";
import { printHeader, reportAndExit } from "../helpers/harness.mjs";
import { runAuditTests } from "./suites/audit-log.mjs";
import { runOutboxTests } from "./suites/outbox.mjs";
import { runBruteForceTests } from "./suites/brute-force.mjs";
import { runSignedLinkTests } from "./suites/signed-links.mjs";

const DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test";

const sql = postgres(DB_URL, { max: 3 });

// ─── Fixtures ────────────────────────────────────────────────────────────

async function setup() {
  const [tenant] = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES ('audit-test-tenant', 'Tenant Auditoria (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`;

  const [user] = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES (${tenant.id}, 'audit@test.internal', 'Usuário Auditoria', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id`;

  return { sql, dbUrl: DB_URL, tenantId: tenant.id, userId: user.id };
}

async function teardown(tenantId) {
  await sql`DELETE FROM outbox_events WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM audit_logs WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM tenants WHERE id = ${tenantId}`;
}

// ─── Runner ──────────────────────────────────────────────────────────────

async function main() {
  printHeader(
    "UVERGS 360 — Testes de Auditoria, Outbox & Auth",
    "W9 Sistemas · Gate F0"
  );

  const ctx = await setup();

  try {
    await runAuditTests(ctx);
    await runOutboxTests(ctx);
    await runBruteForceTests(ctx);
    await runSignedLinkTests(ctx);
  } finally {
    console.log("\n🧹 Teardown...");
    await teardown(ctx.tenantId);
    await sql.end();
  }

  reportAndExit(
    "Auditoria",
    "Todos os testes de auditoria/auth passaram — Gate F0 Audit: GO"
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
