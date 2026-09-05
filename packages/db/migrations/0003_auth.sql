-- =============================================================================
-- Migration 0003: Autenticação, RBAC, Sessões e Signed Access Links
-- =============================================================================

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email                   TEXT NOT NULL,
  email_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at       TIMESTAMPTZ,
  display_name            TEXT NOT NULL,
  avatar_url              TEXT,
  -- Senha hasheada com bcrypt custo 12+ — NUNCA armazenar bruta
  password_hash           TEXT,
  -- 2FA TOTP (RFC 6238) — obrigatório para perfis sensíveis
  totp_secret             TEXT, -- criptografado pela aplicação
  totp_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  totp_verified_at        TIMESTAMPTZ,
  totp_backup_codes       TEXT, -- JSON array hasheado
  -- Status
  status                  TEXT NOT NULL DEFAULT 'pending_verification'
                            CHECK (status IN ('active', 'inactive', 'locked', 'pending_verification')),
  -- Proteção brute force
  failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
  locked_until            TIMESTAMPTZ,
  last_failed_login_at    TIMESTAMPTZ,
  last_successful_login_at TIMESTAMPTZ,
  last_login_ip           INET,
  -- Preferências
  locale                  TEXT NOT NULL DEFAULT 'pt-BR',
  timezone                TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  -- Soft delete (preservar auditoria)
  deleted_at              TIMESTAMPTZ,
  deleted_by              UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Email único por tenant (não globalmente — multi-tenant)
  CONSTRAINT users_email_tenant_unique UNIQUE (email, tenant_id)
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users (tenant_id);
CREATE INDEX IF NOT EXISTS users_status_idx ON users (tenant_id, status);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  description   TEXT,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,
  -- Roles que exigem 2FA obrigatório (§21 v4.2)
  require_2fa   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_name_tenant_unique UNIQUE (tenant_id, name)
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS roles_tenant_id_idx ON roles (tenant_id);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles FORCE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- PERMISSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key                     TEXT NOT NULL, -- convenção: domain.resource.action
  display_name            TEXT NOT NULL,
  description             TEXT,
  module                  TEXT NOT NULL,
  requires_dual_approval  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_key_tenant_unique UNIQUE (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS permissions_tenant_id_idx ON permissions (tenant_id);
CREATE INDEX IF NOT EXISTS permissions_module_idx ON permissions (tenant_id, module);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions FORCE ROW LEVEL SECURITY;

CREATE POLICY permissions_tenant_isolation ON permissions
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- ROLE PERMISSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by    UUID,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_tenant_id_idx ON role_permissions (tenant_id);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_tenant_isolation ON role_permissions
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- USER ROLES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  -- chamber_id: FK adicionado na migration de F1 quando Chamber existir
  chamber_id    UUID,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by   UUID,
  expires_at    TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ,
  revoked_by    UUID,
  revoked_reason TEXT,
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role_id, chamber_id)
);

CREATE INDEX IF NOT EXISTS user_roles_tenant_id_idx ON user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;

CREATE POLICY user_roles_tenant_isolation ON user_roles
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- SESSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Token hasheado — NUNCA armazenar o token bruto
  token_hash              TEXT NOT NULL,
  refresh_token_hash      TEXT,
  -- 2FA confirmado nesta sessão
  mfa_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_verified_at         TIMESTAMPTZ,
  -- Metadados
  ip_address              INET,
  user_agent              TEXT,
  device_fingerprint      TEXT,
  -- Validade
  expires_at              TIMESTAMPTZ NOT NULL,
  revoked_at              TIMESTAMPTZ,
  revoked_reason          TEXT,
  last_activity_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_tenant_id_idx ON sessions (tenant_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions (tenant_id, revoked_at, expires_at);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- SIGNED ACCESS LINKS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signed_access_links (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nonce               TEXT NOT NULL, -- invalidado após uso
  scope               TEXT NOT NULL, -- escopo restrito
  target_user_id      UUID,
  target_email        TEXT,
  target_chamber_id   UUID,
  created_by          UUID NOT NULL REFERENCES users(id),
  -- Expiração máxima: 48h (§13.2 v4.2)
  expires_at          TIMESTAMPTZ NOT NULL,
  -- Uso único
  used_at             TIMESTAMPTZ,
  used_from_ip        INET,
  used_from_user_agent TEXT,
  -- Revogação manual
  revoked_at          TIMESTAMPTZ,
  revoked_by          UUID,
  revoked_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signed_access_links_nonce_unique UNIQUE (nonce)
);

CREATE INDEX IF NOT EXISTS signed_access_links_tenant_id_idx ON signed_access_links (tenant_id);
CREATE INDEX IF NOT EXISTS signed_access_links_expires_at_idx ON signed_access_links (expires_at);
CREATE INDEX IF NOT EXISTS signed_access_links_target_email_idx ON signed_access_links (target_email);

ALTER TABLE signed_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_access_links FORCE ROW LEVEL SECURITY;

CREATE POLICY signed_access_links_tenant_isolation ON signed_access_links
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- GRANTS para app_user
-- RLS filtra por tenant_id — GRANT é necessário para o RLS ser avaliado
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON
  tenants, tenant_themes, feature_flags,
  users, roles, permissions, role_permissions, user_roles,
  sessions, signed_access_links
TO app_user;
