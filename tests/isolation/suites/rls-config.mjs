/**
 * RLS — Verificações de configuração do banco
 *
 * Não testa comportamento, testa que a infraestrutura de isolamento
 * está montada: RLS habilitado, roles corretos, extensions, partições.
 */

import { test } from "../../helpers/harness.mjs";

export async function runRLSConfig({ sql }) {
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

