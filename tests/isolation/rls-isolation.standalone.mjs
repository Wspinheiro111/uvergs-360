/**
 * UVERGS 360 — Testes de Isolamento RLS
 * Execução direta com Node.js (sem framework de teste)
 * 
 * Cobre:
 *   L1 — Isolamento Tenant × Tenant (Cenário Q)
 *   L2 — Isolamento Câmara (fundação)
 *   L3 — Isolamento Pessoa (fundação)
 *   RLS — Verificação de configuração geral
 */

import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test";

const sql = postgres(DB_URL, { max: 5 });

// ============================================================
// FRAMEWORK MÍNIMO DE TESTE
// ============================================================

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function expect(val) {
  return {
    toBe: (expected) => {
      if (val !== expected) throw new Error(`Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(val)}`);
    },
    toEqual: (expected) => {
      if (JSON.stringify(val) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(val)}`);
    },
    toHaveLength: (len) => {
      if (!Array.isArray(val)) throw new Error(`Valor não é array: ${JSON.stringify(val)}`);
      if (val.length !== len) throw new Error(`Esperado length ${len}, recebido ${val.length}`);
    },
    toBe_false: () => {
      if (val !== false) throw new Error(`Esperado false, recebido ${JSON.stringify(val)}`);
    },
    toReject: async () => {
      // val deve ser uma promise que rejeita
      try {
        await val;
        throw new Error("Esperado que rejeitasse, mas resolveu");
      } catch (e) {
        if (e.message === "Esperado que rejeitasse, mas resolveu") throw e;
        // Rejeitou como esperado — ok
      }
    }
  };
}

// Helper: conexão com contexto de tenant/user (simula RLS da app)
// SET não aceita parâmetros bindados ($1) — usar interpolação literal segura
async function withContext(tenantId, userId, fn) {
  const ctx = postgres(DB_URL, { max: 1 });
  try {
    // SET é DDL-like — não aceita bind params, usar unsafe com UUIDs validados
    // UUIDs têm formato fixo [0-9a-f-]{36} — safe para interpolação
    await ctx.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
    await ctx.unsafe(`SET app.current_user_id = '${userId}'`);
    await ctx.unsafe(`SET ROLE app_user`);
    const result = await fn(ctx);
    return result;
  } finally {
    await ctx.unsafe(`RESET ROLE`);
    await ctx.end();
  }
}

// ============================================================
// SETUP
// ============================================================

console.log("\n🔧 Setup — criando dados de teste...\n");

let tenantAId, tenantBId, userA1Id, userA2Id, userB1Id;

async function setup() {
  // Tenants de teste
  const tenants = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES
      ('tenant-a-test', 'Tenant A (Teste)', 'active'),
      ('tenant-b-test', 'Tenant B (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;
  tenantAId = tenants.find(t => t.slug === 'tenant-a-test').id;
  tenantBId = tenants.find(t => t.slug === 'tenant-b-test').id;

  // Usuários de teste
  const users = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES
      (${tenantAId}, 'user-a1@test.internal', 'Usuário A1', 'active'),
      (${tenantAId}, 'user-a2@test.internal', 'Usuário A2', 'active'),
      (${tenantBId}, 'user-b1@test.internal', 'Usuário B1', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;
  userA1Id = users.find(u => u.email === 'user-a1@test.internal').id;
  userA2Id = users.find(u => u.email === 'user-a2@test.internal').id;
  userB1Id = users.find(u => u.email === 'user-b1@test.internal').id;

  console.log(`  Tenant A: ${tenantAId}`);
  console.log(`  Tenant B: ${tenantBId}`);
  console.log(`  User A1:  ${userA1Id}`);
  console.log(`  User B1:  ${userB1Id}`);
}

async function teardown() {
  await sql`DELETE FROM outbox_events WHERE idempotency_key LIKE 'test-%'`;
  await sql`DELETE FROM signed_access_links WHERE scope = 'chamber:read:test'`;
  await sql`DELETE FROM feature_flags WHERE key LIKE 'TEST_%' OR key = 'INJECTION_ATTEMPT'`;
  await sql`DELETE FROM users WHERE email LIKE '%@test.internal'`;
  await sql`DELETE FROM tenants WHERE slug LIKE '%-test'`;
}

// ============================================================
// NÍVEL 1 — ISOLAMENTO DE TENANT
// ============================================================

async function runLevel1() {
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
    } catch (e) {
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

// ============================================================
// NÍVEL 2 — ISOLAMENTO DE CÂMARA (fundação)
// ============================================================

async function runLevel2() {
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

// ============================================================
// NÍVEL 3 — ISOLAMENTO DE PESSOA
// ============================================================

async function runLevel3() {
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

// ============================================================
// RLS — VERIFICAÇÕES DE CONFIGURAÇÃO
// ============================================================

async function runRLSConfig() {
  console.log("\n📋 RLS — Configuração Geral\n");

  await test("Todas as tabelas de domínio têm RLS habilitado", async () => {
    const tables = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'tenant_themes', 'feature_flags',
          'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
          'sessions', 'signed_access_links',
          'audit_logs', 'personal_data_access_logs',
          'outbox_events', 'notifications', 'file_assets',
          'usage_meters', 'security_incidents',
          'import_batches'
        )
    `;

    const sem_rls = tables.filter(t => !t.rowsecurity);
    if (sem_rls.length > 0) {
      throw new Error(`Tabelas SEM RLS: ${sem_rls.map(t => t.tablename).join(', ')}`);
    }
  });

  await test("Funções auxiliares RLS existem", async () => {
    const [row] = await sql`
      SELECT
        app.current_tenant_id() IS NULL AS tenant_null,
        app.current_user_id() IS NULL AS user_null,
        app.is_service_role() IS NOT NULL AS has_svc
    `;
    if (!row.tenant_null) throw new Error("current_tenant_id() deveria retornar NULL sem contexto");
    if (!row.user_null) throw new Error("current_user_id() deveria retornar NULL sem contexto");
    if (!row.has_svc) throw new Error("is_service_role() deveria retornar valor");
  });

  await test("Roles PostgreSQL criados: app_user, service_role, readonly_role", async () => {
    const roles = await sql`
      SELECT rolname FROM pg_roles
      WHERE rolname IN ('app_user', 'service_role', 'readonly_role')
      ORDER BY rolname
    `;
    if (roles.length !== 3) {
      throw new Error(`Esperado 3 roles, encontrado ${roles.length}: ${roles.map(r=>r.rolname).join(', ')}`);
    }
  });

  await test("service_role tem BYPASSRLS", async () => {
    const [row] = await sql`SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'`;
    if (!row.rolbypassrls) throw new Error("service_role não tem BYPASSRLS — FALHA DE SEGURANÇA");
  });

  await test("app_user NÃO tem BYPASSRLS", async () => {
    const [row] = await sql`SELECT rolbypassrls FROM pg_roles WHERE rolname = 'app_user'`;
    if (row.rolbypassrls) throw new Error("app_user tem BYPASSRLS — FALHA DE SEGURANÇA");
  });

  await test("Extensions instaladas: uuid-ossp, pgcrypto, vector", async () => {
    const exts = await sql`
      SELECT extname FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector')
      ORDER BY extname
    `;
    if (exts.length !== 3) {
      throw new Error(`Extensions faltando. Encontradas: ${exts.map(e=>e.extname).join(', ')}`);
    }
  });

  await test("Schemas app, public_ref, audit existem", async () => {
    const schemas = await sql`
      SELECT nspname FROM pg_namespace
      WHERE nspname IN ('app', 'public_ref', 'audit')
      ORDER BY nspname
    `;
    if (schemas.length !== 3) {
      throw new Error(`Schemas faltando. Encontrados: ${schemas.map(s=>s.nspname).join(', ')}`);
    }
  });

  await test("Partições de audit_logs criadas para 2026-2027", async () => {
    const parts = await sql`
      SELECT tablename FROM pg_tables
      WHERE tablename LIKE 'audit_logs_20%'
      ORDER BY tablename
    `;
    if (parts.length < 7) {
      throw new Error(`Esperadas ≥7 partições de audit_logs, encontradas ${parts.length}`);
    }
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("UVERGS 360 — Testes de Isolamento RLS");
  console.log("W9 Sistemas · Gate F0");
  console.log("=".repeat(60));

  try {
    await setup();
    await runLevel1();
    await runLevel2();
    await runLevel3();
    await runRLSConfig();
  } finally {
    console.log("\n🧹 Teardown...");
    await teardown();
    await sql.end();
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${passed} passou | ${failed} falhou`);
  console.log("=".repeat(60));

  if (failures.length > 0) {
    console.log("\nFALHAS:");
    failures.forEach(f => console.log(`  ❌ ${f.name}\n     ${f.error}`));
    process.exit(1);
  } else {
    console.log("\n✅ Todos os testes de isolamento passaram — Gate F0 RLS: GO\n");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
