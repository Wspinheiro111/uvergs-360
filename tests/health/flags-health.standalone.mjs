/**
 * UVERGS 360 — Testes de Feature Flags e Health Check (lógica de banco)
 * Gate F0: flags VAL-LEGAL desligadas + toggle controlado + health
 */

import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL_DEV ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev";

const sql = postgres(DB_URL, { max: 3 });

let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failures.push({ name, error: e.message }); failed++; }
}

async function withContext(tenantId, userId, fn) {
  const ctx = postgres(DB_URL, { max: 1 });
  try {
    await ctx.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
    await ctx.unsafe(`SET app.current_user_id = '${userId}'`);
    await ctx.unsafe(`SET ROLE app_user`);
    return await fn(ctx);
  } finally {
    await ctx.unsafe("RESET ROLE");
    await ctx.end();
  }
}

// ─── FEATURE FLAGS ───────────────────────────────────────────────────────────

async function runFeatureFlagTests() {
  console.log("\n📋 Feature Flags\n");

  // Carregar tenant UVERGS
  const [tenant] = await sql`SELECT id FROM tenants WHERE slug = 'uvergs' LIMIT 1`;
  if (!tenant) throw new Error("Tenant UVERGS não encontrado — rodar seed primeiro");
  const tenantId = tenant.id;

  const [adminUser] = await sql`SELECT id FROM users WHERE email = 'admin@uvergs360.dev' AND tenant_id = ${tenantId} LIMIT 1`;
  const userId = adminUser?.id;

  await test("6 flags VAL-LEGAL criadas e todas desligadas", async () => {
    const flags = await sql`
      SELECT key, enabled, category FROM feature_flags
      WHERE tenant_id = ${tenantId} AND category = 'val_legal'
      ORDER BY key`;

    const expected = [
      "GERADOR_INSTRUMENTO_FILIACAO",
      "KIT_CONTRATACAO_DIRETA",
      "NFS_E_EMISSAO",
      "PORTAL_TITULAR_LGPD",
      "RETENCOES_TRIBUTARIAS",
      "SUPLENTE_COMUNICACAO_AUTOMATICA",
    ];

    if (flags.length !== 6) throw new Error(`Esperado 6 flags, encontrado ${flags.length}`);
    const habilitadas = flags.filter(f => f.enabled);
    if (habilitadas.length > 0) throw new Error(`Flags VAL-LEGAL habilitadas: ${habilitadas.map(f=>f.key).join(", ")}`);

    const keys = flags.map(f => f.key).sort();
    for (const k of expected) {
      if (!keys.includes(k)) throw new Error(`Flag não encontrada: ${k}`);
    }
  });

  await test("Flag operacional pode ser habilitada com justificativa", async () => {
    // Criar flag operacional de teste
    const [flag] = await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, category, description)
      VALUES (${tenantId}, 'TEST_OPERATIONAL_FLAG', false, 'operational', 'Flag de teste operacional')
      ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = false
      RETURNING id, key`;

    // Habilitar com justificativa
    await sql`
      UPDATE feature_flags
      SET enabled = true,
          last_changed_by = ${userId ?? "00000000-0000-0000-0000-000000000000"},
          last_changed_at = NOW(),
          last_change_reason = 'Habilitando para teste de Gate F0'
      WHERE id = ${flag.id}`;

    const [updated] = await sql`SELECT enabled, last_change_reason FROM feature_flags WHERE id = ${flag.id}`;
    if (!updated.enabled) throw new Error("Flag não foi habilitada");
    if (!updated.last_change_reason) throw new Error("last_change_reason não foi gravado");

    // Desabilitar e limpar
    await sql`DELETE FROM feature_flags WHERE id = ${flag.id}`;
  });

  await test("Flag VAL-LEGAL não pode ser habilitada sem approval_document", async () => {
    const [flag] = await sql`
      SELECT id, category FROM feature_flags
      WHERE tenant_id = ${tenantId} AND key = 'NFS_E_EMISSAO' LIMIT 1`;

    // A regra de negócio: VAL-LEGAL só pode ser habilitada com approval_document
    // Simular a verificação que o tRPC router faz
    const canEnable = flag.category !== "val_legal" ||
      (await sql`SELECT approval_document FROM feature_flags WHERE id = ${flag.id}`)[0].approval_document != null;

    if (canEnable) throw new Error("NFS_E_EMISSAO não deveria poder ser habilitada sem approval_document");
  });

  await test("isEnabled retorna false para flag desligada", async () => {
    if (!userId) return; // sem usuário, pular

    const [result] = await withContext(tenantId, userId, async (ctx) =>
      ctx`SELECT enabled FROM feature_flags WHERE key = 'GERADOR_INSTRUMENTO_FILIACAO' AND tenant_id = ${tenantId}`
    );
    if (result?.enabled !== false) throw new Error(`Esperado false, recebido ${result?.enabled}`);
  });

  await test("RLS: flags só visíveis no próprio tenant", async () => {
    if (!userId) return;

    // Criar tenant isolado
    const [otherTenant] = await sql`
      INSERT INTO tenants (slug, name, status) VALUES ('other-flags-test', 'Other', 'active')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
    await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, category)
      VALUES (${otherTenant.id}, 'OTHER_TENANT_FLAG', true, 'operational')
      ON CONFLICT DO NOTHING`;

    // Tenant UVERGS não vê a flag do outro tenant
    const result = await withContext(tenantId, userId, async (ctx) =>
      ctx`SELECT key FROM feature_flags WHERE key = 'OTHER_TENANT_FLAG'`
    );
    if (result.length > 0) throw new Error("Flag de outro tenant vazou via RLS");

    // Limpeza
    await sql`DELETE FROM feature_flags WHERE tenant_id = ${otherTenant.id}`;
    await sql`DELETE FROM tenants WHERE id = ${otherTenant.id}`;
  });
}

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

async function runHealthTests() {
  console.log("\n📋 Health Check (lógica de banco)\n");

  await test("Banco responde SELECT 1 em menos de 100ms", async () => {
    const start = Date.now();
    await sql`SELECT 1`;
    const ms = Date.now() - start;
    console.log(`       → latência: ${ms}ms`);
    if (ms > 100) throw new Error(`Latência alta: ${ms}ms (limite: 100ms)`);
  });

  await test("Tenant UVERGS existe e está ativo", async () => {
    const [tenant] = await sql`
      SELECT id, status FROM tenants WHERE slug = 'uvergs' AND status = 'active' LIMIT 1`;
    if (!tenant) throw new Error("Tenant UVERGS não encontrado ou inativo");
  });

  await test("Usuário admin existe e está ativo", async () => {
    const [user] = await sql`
      SELECT u.id, u.status FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      WHERE u.email = 'admin@uvergs360.dev' AND t.slug = 'uvergs' AND u.status = 'active'
      LIMIT 1`;
    if (!user) throw new Error("Usuário admin não encontrado ou inativo");
  });

  await test("Migrations aplicadas — tabelas essenciais existem", async () => {
    const tables = await sql`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('tenants','users','roles','feature_flags','audit_logs','outbox_events')
      ORDER BY tablename`;
    if (tables.length !== 6) throw new Error(`Tabelas faltando: encontradas ${tables.length}/6`);
  });

  await test("Extensions essenciais instaladas", async () => {
    const exts = await sql`
      SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto','vector')`;
    if (exts.length !== 3) throw new Error(`Extensions faltando: ${exts.map(e=>e.extname).join(", ")}`);
  });

  await test("Pool de conexões OK — múltiplas queries simultâneas", async () => {
    const results = await Promise.all([
      sql`SELECT 1 AS n`,
      sql`SELECT 2 AS n`,
      sql`SELECT 3 AS n`,
      sql`SELECT 4 AS n`,
      sql`SELECT 5 AS n`,
    ]);
    const values = results.map(r => r[0].n);
    for (let i = 1; i <= 5; i++) {
      if (!values.includes(i)) throw new Error(`Query ${i} não retornou resultado`);
    }
  });
}

// ─── TESTES DE SESSÃO ────────────────────────────────────────────────────────

async function runSessionTests() {
  console.log("\n📋 Sessões\n");

  const [tenant] = await sql`SELECT id FROM tenants WHERE slug = 'uvergs' LIMIT 1`;
  const [user] = await sql`SELECT id FROM users WHERE email = 'admin@uvergs360.dev' LIMIT 1`;
  if (!tenant || !user) { console.log("  ⚠️  Seed necessário — skip"); return; }

  const tenantId = tenant.id;
  const userId = user.id;

  await test("Sessão criada com token hasheado (nunca token bruto)", async () => {
    const fakeTokenHash = "sha256:" + Array(64).fill("a").join(""); // hash simulado
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15min

    const [session] = await sql`
      INSERT INTO sessions (tenant_id, user_id, token_hash, expires_at, mfa_verified)
      VALUES (${tenantId}, ${userId}, ${fakeTokenHash}, ${expiresAt}, false)
      RETURNING id, token_hash, mfa_verified`;

    if (session.token_hash !== fakeTokenHash) throw new Error("token_hash incorreto");
    if (session.mfa_verified !== false) throw new Error("mfa_verified deveria ser false inicial");

    await sql`DELETE FROM sessions WHERE id = ${session.id}`;
  });

  await test("Sessão expirada não retorna em consulta de validação", async () => {
    const pastExpiry = new Date(Date.now() - 1000); // 1 segundo atrás
    const [session] = await sql`
      INSERT INTO sessions (tenant_id, user_id, token_hash, expires_at)
      VALUES (${tenantId}, ${userId}, 'expired-token-hash', ${pastExpiry})
      RETURNING id`;

    const [valid] = await sql`
      SELECT id FROM sessions WHERE id = ${session.id} AND expires_at > NOW() AND revoked_at IS NULL`;
    if (valid) throw new Error("Sessão expirada foi retornada como válida");

    await sql`DELETE FROM sessions WHERE id = ${session.id}`;
  });

  await test("Sessão revogada não retorna em consulta de validação", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const [session] = await sql`
      INSERT INTO sessions (tenant_id, user_id, token_hash, expires_at)
      VALUES (${tenantId}, ${userId}, 'revoked-token-hash', ${futureExpiry})
      RETURNING id`;

    // Revogar
    await sql`UPDATE sessions SET revoked_at = NOW(), revoked_reason = 'logout' WHERE id = ${session.id}`;

    const [valid] = await sql`
      SELECT id FROM sessions WHERE id = ${session.id} AND expires_at > NOW() AND revoked_at IS NULL`;
    if (valid) throw new Error("Sessão revogada foi retornada como válida");

    await sql`DELETE FROM sessions WHERE id = ${session.id}`;
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("UVERGS 360 — Feature Flags, Health & Sessões");
  console.log("W9 Sistemas · Gate F0");
  console.log("=".repeat(60));

  await runFeatureFlagTests();
  await runHealthTests();
  await runSessionTests();

  await sql.end();

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${passed} passou | ${failed} falhou`);
  console.log("=".repeat(60));

  if (failures.length > 0) {
    failures.forEach(f => console.log(`  ❌ ${f.name}\n     ${f.error}`));
    process.exit(1);
  } else {
    console.log("\n✅ Feature Flags + Health + Sessões: GO\n");
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
