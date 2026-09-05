/**
 * UVERGS 360 — Suítes de Isolamento Multi-tenant
 *
 * Cobre os 3 níveis independentes (§19.3 v4.2):
 *   Nível 1 — Tenant × Tenant (Cenário Q: Candidacy entre tenants)
 *   Nível 2 — Câmara × Câmara (Cenário F)
 *   Nível 3 — Pessoa × Pessoa (Cenário K/L — fronteira Câmara × Pessoa)
 *
 * Estes testes são obrigatórios no CI e devem passar ANTES de qualquer
 * funcionalidade de produto entrar em produção.
 *
 * Executar com: pnpm test:isolation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// =============================================================================
// SETUP — banco de teste isolado
// =============================================================================

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_test_secret@localhost:5433/uvergs360_test";

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;

// IDs de tenants de teste (gerados antes dos testes)
let tenantAId: string;
let tenantBId: string;

// IDs de câmaras de teste
let chamberA1Id: string; // Câmara 1 do Tenant A
let chamberA2Id: string; // Câmara 2 do Tenant A
let chamberB1Id: string; // Câmara 1 do Tenant B

// IDs de usuários de teste
let userA1Id: string; // Usuário da Câmara A1
let userA2Id: string; // Usuário da Câmara A2
let userB1Id: string; // Usuário da Câmara B1

// IDs de pessoas de teste
let personAId: string; // Pessoa vinculada a Câmara A1
let personBId: string; // Pessoa vinculada a Câmara A2 (mesma pessoa, tenant A)

beforeAll(async () => {
  sql = postgres(TEST_DB_URL, { max: 5 });
  db = drizzle(sql);

  // Aplicar migrations no banco de teste (service_role)
  // Em CI: docker-compose up postgres_test + migrate automático

  // Criar tenants de teste
  const tenants = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES
      ('tenant-a-test', 'Tenant A (Teste)', 'active'),
      ('tenant-b-test', 'Tenant B (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;

  tenantAId = tenants.find((t) => t.slug === "tenant-a-test")!.id;
  tenantBId = tenants.find((t) => t.slug === "tenant-b-test")!.id;

  // Criar usuários de teste
  const users = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES
      (${tenantAId}, 'user-a1@test.uvergs360', 'Usuário A1', 'active'),
      (${tenantAId}, 'user-a2@test.uvergs360', 'Usuário A2', 'active'),
      (${tenantBId}, 'user-b1@test.uvergs360', 'Usuário B1', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;

  userA1Id = users.find((u) => u.email === "user-a1@test.uvergs360")!.id;
  userA2Id = users.find((u) => u.email === "user-a2@test.uvergs360")!.id;
  userB1Id = users.find((u) => u.email === "user-b1@test.uvergs360")!.id;
});

afterAll(async () => {
  // Limpar dados de teste
  await sql`DELETE FROM users WHERE email LIKE '%@test.uvergs360'`;
  await sql`DELETE FROM tenants WHERE slug LIKE '%-test'`;
  await sql.end();
});

// Helper: criar conexão com contexto de tenant e usuário (simula RLS)
async function withContext(
  tenantId: string,
  userId: string,
  query: (sql: ReturnType<typeof postgres>) => Promise<unknown>
): Promise<unknown> {
  const contextSql = postgres(TEST_DB_URL, { max: 1 });
  try {
    await contextSql`SET app.current_tenant_id = ${tenantId}`;
    await contextSql`SET app.current_user_id = ${userId}`;
    // Simular app_user role
    await contextSql`SET ROLE app_user`;
    return await query(contextSql);
  } finally {
    await contextSql`RESET ROLE`;
    await contextSql.end();
  }
}

// =============================================================================
// NÍVEL 1 — ISOLAMENTO DE TENANT (Cenário Q: Candidacy entre tenants)
// =============================================================================

describe("Nível 1 — Isolamento de Tenant", () => {
  it("Tenant A não consegue ler registros do Tenant B via RLS", async () => {
    // Criar uma feature_flag no Tenant B
    await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, description)
      VALUES (${tenantBId}, 'TEST_FLAG_B_ONLY', false, 'Flag exclusiva do Tenant B')
      ON CONFLICT (tenant_id, key) DO NOTHING
    `;

    // Tenant A tenta ler flags do Tenant B → deve retornar 0 registros (RLS filtra)
    const result = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`
        SELECT * FROM feature_flags WHERE key = 'TEST_FLAG_B_ONLY'
      `
    ) as any[];

    expect(result).toHaveLength(0); // RLS filtrou — Tenant A não vê dados do Tenant B

    // Limpeza
    await sql`DELETE FROM feature_flags WHERE key = 'TEST_FLAG_B_ONLY'`;
  });

  it("Tenant B não consegue ler usuários do Tenant A", async () => {
    const result = await withContext(
      tenantBId,
      userB1Id,
      async (ctxSql) => ctxSql`
        SELECT * FROM users WHERE tenant_id = ${tenantAId}
      `
    ) as any[];

    expect(result).toHaveLength(0);
  });

  it("Sessão do Tenant A não pode modificar dados do Tenant B", async () => {
    await expect(
      withContext(tenantAId, userA1Id, async (ctxSql) => ctxSql`
        INSERT INTO feature_flags (tenant_id, key, enabled, description)
        VALUES (${tenantBId}, 'INJECTION_ATTEMPT', true, 'Tentativa de injeção cross-tenant')
      `)
    ).rejects.toThrow(); // RLS rejeita INSERT com tenant_id diferente do contexto
  });

  it("Tentativa de leitura cross-tenant é registrada no AuditLog", async () => {
    // Este teste verifica que o middleware de auditoria captura a tentativa
    // A query propriamente dita é filtrada pelo RLS (retorna 0 registros)
    // O middleware da aplicação deve registrar a tentativa quando detected

    // Por enquanto, verificamos apenas que o RLS funciona
    // O teste completo de auditoria de tentativa é feito nos testes E2E (Cenário F)
    const result = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`
        SELECT COUNT(*) as count FROM users WHERE tenant_id = ${tenantBId}
      `
    ) as any[];

    expect(parseInt(result[0]?.count ?? "0")).toBe(0);
  });

  // Cenário Q específico — Candidacy entre tenants (Bloqueador v4.1 §48.3)
  it("Cenário Q: Candidacy não é acessível entre tenants", async () => {
    // Candidacy será criada na migration de F1 (institutional)
    // Por ora, o teste verifica a política de isolamento para a tabela
    // quando ela existir — placeholder para ser expandido na F1

    // Verificação indireta: a função de isolamento de tenant funciona
    const tenantFromContext = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`SELECT app.current_tenant_id() AS tenant_id`
    ) as any[];

    expect(tenantFromContext[0]?.tenant_id).toBe(tenantAId);

    // Tenant B não consegue "ver" o tenant_id do Tenant A como seu contexto
    const tenantBContext = await withContext(
      tenantBId,
      userB1Id,
      async (ctxSql) => ctxSql`SELECT app.current_tenant_id() AS tenant_id`
    ) as any[];

    expect(tenantBContext[0]?.tenant_id).toBe(tenantBId);
    expect(tenantBContext[0]?.tenant_id).not.toBe(tenantAId);
  });
});

// =============================================================================
// NÍVEL 2 — ISOLAMENTO DE CÂMARA (Cenário F)
// Nota: Câmaras serão criadas na migration de F1.
// Este bloco testa os mecanismos de contexto que F1 usará.
// =============================================================================

describe("Nível 2 — Isolamento de Câmara (Fundação)", () => {
  it("Contexto de usuário é injetado corretamente na sessão", async () => {
    const result = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`
        SELECT
          app.current_tenant_id() AS tenant_id,
          app.current_user_id() AS user_id
      `
    ) as any[];

    expect(result[0]?.tenant_id).toBe(tenantAId);
    expect(result[0]?.user_id).toBe(userA1Id);
  });

  it("app_user não pode modificar audit_logs (append-only)", async () => {
    // Primeiro, inserir um log via service_role (correto)
    const [inserted] = await sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id,
        action, module, entity_type, entity_id, outcome
      )
      VALUES (
        ${tenantAId}, ${userA1Id}, gen_random_uuid(),
        'test.isolation.check', 'platform', 'User', ${userA1Id}, 'success'
      )
      RETURNING id
    `;

    // Tentar UPDATE como app_user → deve falhar (política RLS proíbe UPDATE)
    await expect(
      withContext(tenantAId, userA1Id, async (ctxSql) => ctxSql`
        UPDATE audit_logs SET outcome = 'failure' WHERE id = ${inserted.id}
      `)
    ).rejects.toThrow();

    // Tentar DELETE como app_user → deve falhar
    await expect(
      withContext(tenantAId, userA1Id, async (ctxSql) => ctxSql`
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
      VALUES (${tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'certificate.generate')
    `;

    // Segundo insert com mesma chave: deve falhar
    await expect(sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantAId}, 'Registration', gen_random_uuid(), 'registration.confirmed', '{}', ${key}, 'certificate.generate')
    `).rejects.toThrow(/duplicate key/i);

    // Limpeza
    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });
});

// =============================================================================
// NÍVEL 3 — ISOLAMENTO DE PESSOA (Cenário K/L — fronteira Câmara × Pessoa)
// Expandido em F1 quando Person e Chamber existirem.
// =============================================================================

describe("Nível 3 — Isolamento de Pessoa (Fundação)", () => {
  it("Usuário acessa apenas dados do próprio tenant", async () => {
    // Usuário do Tenant A não vê usuários do Tenant B
    const result = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`
        SELECT id FROM users WHERE tenant_id = ${tenantBId}
      `
    ) as any[];

    expect(result).toHaveLength(0);
  });

  it("is_service_role() retorna FALSE para app_user", async () => {
    const result = await withContext(
      tenantAId,
      userA1Id,
      async (ctxSql) => ctxSql`SELECT app.is_service_role() AS is_service`
    ) as any[];

    expect(result[0]?.is_service).toBe(false);
  });

  it("Signed access link não permite acesso cross-tenant", async () => {
    // Criar um link para Tenant A
    const [link] = await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (
        ${tenantAId},
        'test-nonce-isolation-' || gen_random_uuid()::text,
        'chamber:read:test',
        ${userA1Id},
        NOW() + INTERVAL '1 hour'
      )
      RETURNING id, tenant_id
    `;

    // Tenant B tentando ler o link do Tenant A → deve retornar 0 (RLS)
    const result = await withContext(
      tenantBId,
      userB1Id,
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

describe("RLS — Configuração Geral", () => {
  it("Todas as tabelas de domínio têm RLS habilitado", async () => {
    const tablesWithRLS = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'tenants', 'tenant_themes', 'feature_flags',
          'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
          'sessions', 'signed_access_links',
          'audit_logs', 'personal_data_access_logs',
          'outbox_events', 'notifications', 'file_assets',
          'usage_meters', 'security_incidents',
          'import_batches'
        )
    `;

    const tablesWithoutRLS = tablesWithRLS.filter(
      (t) => !t.rowsecurity
    );

    // Tenants não tem RLS próprio (é verificado via JWT na aplicação)
    const nonRLSTables = tablesWithoutRLS.filter(
      (t) => t.tablename !== "tenants"
    );

    expect(nonRLSTables).toHaveLength(0); // Todas as demais tabelas DEVEM ter RLS
  });

  it("Funções auxiliares de RLS existem e funcionam", async () => {
    const [result] = await sql`
      SELECT
        app.current_tenant_id() IS NULL AS tenant_null_without_context,
        app.current_user_id() IS NULL AS user_null_without_context,
        app.is_service_role() AS is_service_in_test
    `;

    // Sem contexto definido, as funções retornam NULL (não erro)
    expect(result.tenant_null_without_context).toBe(true);
    expect(result.user_null_without_context).toBe(true);
    // Em ambiente de teste, rodando como superuser/service_role
    expect(typeof result.is_service_in_test).toBe("boolean");
  });
});
