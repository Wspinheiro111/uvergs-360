/**
 * UVERGS 360 — RLS — Configuração Geral
 *
 * Obrigatório no CI (§19.3 v4.2): deve passar antes de qualquer
 * funcionalidade de produto entrar em produção.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, setupFixtures, teardownFixtures } from "./fixtures";

beforeAll(setupFixtures);
afterAll(teardownFixtures);

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
