-- =============================================================================
-- Migration 0007: privilégios efetivos da service_role
--
-- A role possui BYPASSRLS, mas ainda precisa de privilégios SQL explícitos.
-- Mantemos os logs append-only: service_role pode ler e inserir, nunca alterar
-- ou excluir registros de auditoria.
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenants, tenant_themes, feature_flags,
  users, roles, permissions, role_permissions, user_roles,
  sessions, signed_access_links,
  outbox_events, notifications, file_assets,
  usage_meters, security_incidents, import_batches
TO service_role;

GRANT SELECT, INSERT ON
  audit_logs,
  audit_logs_2026_09,
  audit_logs_2026_10,
  audit_logs_2026_11,
  audit_logs_2026_12,
  audit_logs_2027_01,
  audit_logs_2027_02,
  audit_logs_2027_03,
  audit_logs_default,
  personal_data_access_logs,
  personal_data_access_logs_2026_09,
  personal_data_access_logs_2026_10,
  personal_data_access_logs_2026_11,
  personal_data_access_logs_2026_12,
  personal_data_access_logs_default
TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, public_ref TO service_role;

