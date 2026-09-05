-- =============================================================================
-- Migration 0006: GRANTs para app_user e is_service_role() corrigido
-- IDEMPOTENTE: usa CREATE OR REPLACE e GRANTs idempotentes
-- =============================================================================

-- Corrigir is_service_role() para usar current_role (role ATIVO da sessão)
-- não pg_has_role (membership), que causava is_service_role()=true para app_user
CREATE OR REPLACE FUNCTION app.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT current_role = 'service_role'
$$;

-- GRANTs para app_user — RLS filtra por tenant_id, GRANT permite chegar ao RLS
GRANT SELECT, INSERT, UPDATE ON
  tenants, tenant_themes, feature_flags,
  users, roles, permissions, role_permissions, user_roles,
  sessions, signed_access_links,
  outbox_events, notifications, file_assets,
  usage_meters, security_incidents, import_batches
TO app_user;

-- audit_logs: app_user só pode SELECT (INSERT exclusivo do service_role via RLS)
GRANT SELECT ON audit_logs, personal_data_access_logs TO app_user;

COMMENT ON FUNCTION app.is_service_role() IS
  'Retorna true APENAS se o role ATIVO da sessão (current_role) for service_role. '
  'Corrigido em 0006: pg_has_role verifica membership (sempre true para uvergs360), '
  'current_role verifica o role EFETIVO após SET ROLE.';
