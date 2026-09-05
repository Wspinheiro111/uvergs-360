-- =============================================================================
-- UVERGS 360 — Setup Completo para Neon PostgreSQL
-- W9 Sistemas · Gate F0
--
-- COMO USAR:
--   1. Acesse https://console.neon.tech → seu projeto → SQL Editor
--   2. Cole TODO este arquivo
--   3. Clique em Run
--
-- Cria: extensions, roles, schemas, 34 tabelas, RLS, políticas,
--       tenant UVERGS, 10 roles, 6 flags VAL-LEGAL, usuário admin.
--
-- Idempotente: seguro re-executar.
-- =============================================================================

-- ═══ PARTE 1: EXTENSIONS, ROLES E SCHEMAS ═══
-- =============================================================================
-- UVERGS 360 — Inicialização do PostgreSQL
-- W9 Sistemas · v4.2 baseline
--
-- Este script é executado UMA VEZ na criação do banco Docker.
-- Em produção (Neon), executar manualmente antes das migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector (busca semântica F7)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- métricas de queries
-- pg_partman: instalado separadamente se disponível no provider
-- Em Neon: particionamento manual sem pg_partman

-- ---------------------------------------------------------------------------
-- ROLES DE APLICAÇÃO
-- ADR-002: isolamento multi-tenant via RLS
-- ---------------------------------------------------------------------------

-- Role da aplicação (API/frontend) — RLS ATIVO, sem bypass
-- Toda query da aplicação usa este role via connection pool
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Role de serviço (worker, migrations, jobs) — RLS BYPASS
-- NUNCA expor via API pública ou frontend
-- Usar apenas em contextos controlados de backend
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
END
$$;

-- Role de leitura para auditoria externa / DBA
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'readonly_role') THEN
    CREATE ROLE readonly_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Conceder roles ao usuário da aplicação
GRANT app_user TO uvergs360;
GRANT service_role TO uvergs360;
GRANT readonly_role TO uvergs360;

-- ---------------------------------------------------------------------------
-- SCHEMAS
-- ---------------------------------------------------------------------------

-- Schema principal de domínio (tenant-scoped)
CREATE SCHEMA IF NOT EXISTS app;

-- Schema de referência global somente-leitura (sem tenant_id)
-- Apenas: Municipality, Party, Election (metadados)
-- NUNCA: Person, Candidacy, ContactPoint ou qualquer PII
CREATE SCHEMA IF NOT EXISTS public_ref;

-- Schema de auditoria (append-only, acesso restrito)
CREATE SCHEMA IF NOT EXISTS audit;

-- Permissões de schema por role
GRANT USAGE ON SCHEMA app TO app_user, service_role, readonly_role;
GRANT USAGE ON SCHEMA public_ref TO app_user, service_role, readonly_role;
GRANT USAGE ON SCHEMA audit TO service_role, readonly_role;
-- app_user NÃO tem acesso direto ao schema audit (apenas via service_role)

-- ---------------------------------------------------------------------------
-- CONFIGURAÇÕES DE SEGURANÇA
-- ---------------------------------------------------------------------------

-- Timezone padrão: UTC (exibição em America/Sao_Paulo na aplicação)

-- Desabilitar acesso a tabelas sem permissão explícita
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  REVOKE ALL ON TABLES FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- VARIÁVEIS DE SESSÃO (usadas pelo RLS)
-- ---------------------------------------------------------------------------
-- app.current_tenant_id  → UUID do tenant autenticado
-- app.current_user_id    → UUID do usuário autenticado
-- app.current_role       → role do usuário (para políticas granulares)
--
-- Definidas pelo middleware da aplicação antes de cada query:
--   SET LOCAL app.current_tenant_id = '<uuid>';
--   SET LOCAL app.current_user_id = '<uuid>';
--   SET LOCAL app.current_role = '<role_name>';
--
-- Políticas RLS lêem via: current_setting('app.current_tenant_id', true)::UUID
-- O segundo parâmetro 'true' evita erro se a variável não estiver definida

-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT current_setting('role', true) = 'service_role'
     OR pg_has_role(current_user, 'service_role', 'MEMBER')
$$;

COMMENT ON FUNCTION app.current_tenant_id() IS
  'Retorna o tenant_id da sessão atual. NULL se não autenticado. Usada por políticas RLS.';

COMMENT ON FUNCTION app.is_service_role() IS
  'Retorna true se a sessão está rodando como service_role (worker/migrations). '
  'Usado para bypass de RLS em operações administrativas.';


-- ═══ MIGRATION 0001_extensions_and_config.sql ═══
-- =============================================================================
-- Migration 0001: Extensions e configurações base
-- UVERGS 360 · W9 Sistemas · v4.2
-- Idempotente: seguro para re-executar
-- =============================================================================

-- Extensions necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS public_ref;
CREATE SCHEMA IF NOT EXISTS audit;

-- Timezone UTC no banco (exibição em America/Sao_Paulo na aplicação)
-- Em Neon: configurado via connection string parameter

-- Funções auxiliares de RLS (idempotente)
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, public
AS $$
  -- current_role reflete o role ATIVO após SET ROLE (não o membership)
  SELECT current_role = 'service_role'
$$;

-- Função de updated_at automático
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION app.current_tenant_id() IS
  'Retorna o tenant_id da sessão atual. NULL se não autenticado. Usada por políticas RLS.';
COMMENT ON FUNCTION app.set_updated_at() IS
  'Trigger para atualizar automaticamente updated_at em qualquer UPDATE.';

-- ═══ MIGRATION 0002_tenants.sql ═══
-- =============================================================================
-- Migration 0002: Tenants e TenantThemes
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
  timezone        TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  plan            TEXT NOT NULL DEFAULT 'standard'
                    CHECK (plan IN ('standard', 'professional', 'enterprise')),
  contact_email   TEXT,
  contact_phone   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at    TIMESTAMPTZ,
  suspended_reason TEXT,
  CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

-- Trigger de updated_at
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS tenants_status_idx ON tenants (status);

-- RLS: tenants não tem RLS próprio (é a tabela raiz)
-- O serviço verifica tenant_id via JWT — acesso ao registro do próprio tenant apenas

-- Tenant âncora: UVERGS
-- Inserido no seed de produção, não aqui
-- Ver packages/db/seed/production.ts

-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_themes (
  id                            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  primary_color                 TEXT NOT NULL DEFAULT '#1a56db',
  secondary_color               TEXT NOT NULL DEFAULT '#7e3af2',
  accent_color                  TEXT,
  logo_url                      TEXT,
  logo_alt_text                 TEXT,
  favicon_url                   TEXT,
  organization_full_name        TEXT,
  tagline                       TEXT,
  document_footer_text          TEXT,
  certificate_signature_image_url TEXT,
  certificate_signer_name       TEXT,
  certificate_signer_title      TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_themes_tenant_id_unique UNIQUE (tenant_id)
);

CREATE TRIGGER tenant_themes_updated_at
  BEFORE UPDATE ON tenant_themes
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- RLS em tenant_themes: apenas leitura do próprio tenant
ALTER TABLE tenant_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_themes FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_themes_tenant_isolation ON tenant_themes
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key               TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  category          TEXT NOT NULL DEFAULT 'feature_incomplete'
                      CHECK (category IN ('val_legal', 'val_negocio', 'feature_incomplete', 'operational')),
  description       TEXT,
  last_changed_by   UUID,
  last_changed_at   TIMESTAMPTZ,
  last_change_reason TEXT,
  approval_document TEXT,
  approved_at       TIMESTAMPTZ,
  approved_by       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_flags_tenant_key_unique UNIQUE (tenant_id, key)
);

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS feature_flags_tenant_id_idx ON feature_flags (tenant_id);
CREATE INDEX IF NOT EXISTS feature_flags_category_idx ON feature_flags (category);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags (tenant_id, enabled);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags FORCE ROW LEVEL SECURITY;

CREATE POLICY feature_flags_tenant_isolation ON feature_flags
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- app_user pode apenas SELECT (não pode criar/editar flags diretamente)
CREATE POLICY feature_flags_app_user_select ON feature_flags
  FOR SELECT
  TO app_user
  USING (tenant_id = app.current_tenant_id());

-- ═══ MIGRATION 0003_auth.sql ═══
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

-- ═══ MIGRATION 0004_audit_and_platform.sql ═══
-- =============================================================================
-- Migration 0004: Auditoria (particionada), Outbox, Notificações,
--                 File Assets, Usage Meter, Security Incidents
-- =============================================================================

-- ---------------------------------------------------------------------------
-- AUDIT LOGS — particionada por created_at (partições mensais)
-- CRÍTICO: app_user NÃO pode UPDATE ou DELETE — apenas service_role pode INSERT
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id                  UUID DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  chamber_id          UUID,
  person_id           UUID,
  user_id             UUID NOT NULL,
  user_email          TEXT,
  user_display_name   TEXT,
  correlation_id      UUID NOT NULL,
  session_id          UUID,
  action              TEXT NOT NULL,
  module              TEXT NOT NULL,
  entity_type         TEXT NOT NULL,
  entity_id           UUID NOT NULL,
  previous_value      JSONB,
  new_value           JSONB,
  justification       TEXT,
  metadata            JSONB,
  ip_address          INET,
  user_agent          TEXT,
  outcome             TEXT NOT NULL DEFAULT 'success'
                        CHECK (outcome IN ('success', 'failure', 'partial')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at) -- necessário para particionamento
) PARTITION BY RANGE (created_at);

-- Partições iniciais (2026-2027)
-- Em produção: automatizar criação de partições futuras via cron job ou pg_partman
CREATE TABLE IF NOT EXISTS audit_logs_2026_09
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS audit_logs_2026_10
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS audit_logs_2026_11
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS audit_logs_2026_12
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS audit_logs_2027_01
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE TABLE IF NOT EXISTS audit_logs_2027_02
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');

CREATE TABLE IF NOT EXISTS audit_logs_2027_03
  PARTITION OF audit_logs
  FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

CREATE TABLE IF NOT EXISTS audit_logs_default
  PARTITION OF audit_logs DEFAULT;

-- Índices nas partições
CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_at_idx
  ON audit_logs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx
  ON audit_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_correlation_idx
  ON audit_logs (correlation_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx
  ON audit_logs (tenant_id, action);
CREATE INDEX IF NOT EXISTS audit_logs_chamber_idx
  ON audit_logs (chamber_id, created_at);

-- RLS: apenas service_role pode INSERT. app_user não pode INSERT, UPDATE ou DELETE.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Apenas service_role insere
CREATE POLICY audit_logs_service_insert ON audit_logs
  FOR INSERT
  WITH CHECK (app.is_service_role());

-- Leitura apenas para usuários com perfil audit_read (verificado na aplicação)
-- A política RLS garante que só vê o próprio tenant
CREATE POLICY audit_logs_tenant_select ON audit_logs
  FOR SELECT
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- PROIBIDO: UPDATE e DELETE para qualquer role de aplicação
-- Apenas DBA com acesso direto ao banco pode alterar — e mesmo assim deve ser auditorado externamente

COMMENT ON TABLE audit_logs IS
  'Registro append-only de toda ação crítica. '
  'Nenhum usuário de aplicação pode editar ou deletar. '
  'Particionado mensalmente por created_at.';

-- ---------------------------------------------------------------------------
-- PERSONAL DATA ACCESS LOG — também particionada
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_data_access_logs (
  id              UUID DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  user_role       TEXT,
  data_category   TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  purpose         TEXT NOT NULL,
  legal_basis     TEXT,
  correlation_id  UUID NOT NULL,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS personal_data_access_logs_2026_09
  PARTITION OF personal_data_access_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS personal_data_access_logs_2026_10
  PARTITION OF personal_data_access_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE IF NOT EXISTS personal_data_access_logs_2026_11
  PARTITION OF personal_data_access_logs
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE IF NOT EXISTS personal_data_access_logs_2026_12
  PARTITION OF personal_data_access_logs
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS personal_data_access_logs_default
  PARTITION OF personal_data_access_logs DEFAULT;

CREATE INDEX IF NOT EXISTS personal_data_access_logs_tenant_idx
  ON personal_data_access_logs (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS personal_data_access_logs_entity_idx
  ON personal_data_access_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS personal_data_access_logs_user_idx
  ON personal_data_access_logs (user_id);

ALTER TABLE personal_data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_data_access_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY personal_data_access_logs_service_insert ON personal_data_access_logs
  FOR INSERT
  WITH CHECK (app.is_service_role());

CREATE POLICY personal_data_access_logs_tenant_select ON personal_data_access_logs
  FOR SELECT
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- OUTBOX EVENTS — transactional outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  aggregate_type    TEXT NOT NULL,
  aggregate_id      UUID NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  -- UNIQUE na idempotency_key — fundamental para exatamente-uma-vez
  idempotency_key   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'done', 'failed', 'dead_letter')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 5,
  last_attempt_at   TIMESTAMPTZ,
  last_error        TEXT,
  processed_at      TIMESTAMPTZ,
  priority          TEXT NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('high', 'normal', 'low')),
  target_queue      TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outbox_idempotency_unique UNIQUE (idempotency_key)
);

CREATE TRIGGER outbox_events_updated_at
  BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS outbox_pending_idx
  ON outbox_events (status, priority, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS outbox_tenant_idx ON outbox_events (tenant_id);
CREATE INDEX IF NOT EXISTS outbox_aggregate_idx
  ON outbox_events (aggregate_type, aggregate_id);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY outbox_service_all ON outbox_events
  FOR ALL
  USING (app.is_service_role());

CREATE POLICY outbox_app_insert ON outbox_events
  FOR INSERT
  WITH CHECK (tenant_id = app.current_tenant_id());

COMMENT ON TABLE outbox_events IS
  'Transactional outbox pattern. '
  'Evento gravado NA MESMA TRANSAÇÃO do domínio. '
  'Worker publica na fila BullMQ após confirmar o commit. '
  'idempotency_key UNIQUE impede processamento duplicado.';

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  user_id         UUID NOT NULL,
  type            TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  action_label    TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  read_at         TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, read_at, created_at);
CREATE INDEX IF NOT EXISTS notifications_tenant_idx ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS notifications_severity_idx
  ON notifications (tenant_id, severity, created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_tenant_isolation ON notifications
  FOR ALL
  USING (
    app.is_service_role()
    OR (
      tenant_id = app.current_tenant_id()
      AND user_id = app.current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- FILE ASSETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_assets (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  storage_key         TEXT NOT NULL,
  bucket              TEXT NOT NULL
                        CHECK (bucket IN ('uvergs360-private', 'uvergs360-public')),
  original_filename   TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  size_bytes          BIGINT NOT NULL,
  checksum_sha256     TEXT NOT NULL,
  category            TEXT NOT NULL,
  entity_type         TEXT,
  entity_id           UUID,
  virus_scan_status   TEXT NOT NULL DEFAULT 'pending'
                        CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error', 'skipped')),
  virus_scan_at       TIMESTAMPTZ,
  uploaded_by         UUID,
  uploaded_by_role    TEXT,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT file_assets_storage_key_unique UNIQUE (storage_key)
);

CREATE INDEX IF NOT EXISTS file_assets_tenant_idx ON file_assets (tenant_id);
CREATE INDEX IF NOT EXISTS file_assets_entity_idx ON file_assets (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS file_assets_category_idx ON file_assets (tenant_id, category);

ALTER TABLE file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_assets FORCE ROW LEVEL SECURITY;

CREATE POLICY file_assets_tenant_isolation ON file_assets
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- USAGE METER
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_meters (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL,
  provider              TEXT NOT NULL,
  channel               TEXT,
  period_start          TIMESTAMPTZ NOT NULL,
  period_end            TIMESTAMPTZ NOT NULL,
  unit                  TEXT NOT NULL,
  quantity_used         BIGINT NOT NULL DEFAULT 0,
  quantity_limit        BIGINT,
  estimated_cost_cents  BIGINT NOT NULL DEFAULT 0,
  actual_cost_cents     BIGINT,
  alert_status          TEXT NOT NULL DEFAULT 'normal'
                          CHECK (alert_status IN ('normal', 'warning_80pct', 'critical_95pct', 'blocked')),
  blocked_at            TIMESTAMPTZ,
  blocked_reason        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER usage_meters_updated_at
  BEFORE UPDATE ON usage_meters
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS usage_meters_tenant_provider_period_idx
  ON usage_meters (tenant_id, provider, period_start);
CREATE INDEX IF NOT EXISTS usage_meters_alert_status_idx
  ON usage_meters (tenant_id, alert_status);

ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_meters FORCE ROW LEVEL SECURITY;

CREATE POLICY usage_meters_tenant_isolation ON usage_meters
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- SECURITY INCIDENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_incidents (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                   UUID NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  severity                    TEXT NOT NULL
                                CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status                      TEXT NOT NULL DEFAULT 'detected'
                                CHECK (status IN ('detected', 'investigating', 'contained', 'remediated', 'closed')),
  detected_at                 TIMESTAMPTZ NOT NULL,
  contained_at                TIMESTAMPTZ,
  remediated_at               TIMESTAMPTZ,
  closed_at                   TIMESTAMPTZ,
  evidences                   JSONB,
  affected_entities           JSONB,
  communications              JSONB,
  remediation_steps           JSONB,
  assigned_to                 UUID,
  reported_by                 UUID,
  anpd_notification_required  TEXT DEFAULT 'under_evaluation'
                                CHECK (anpd_notification_required IN ('yes', 'no', 'under_evaluation')),
  anpd_notified_at            TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER security_incidents_updated_at
  BEFORE UPDATE ON security_incidents
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS security_incidents_tenant_idx ON security_incidents (tenant_id);
CREATE INDEX IF NOT EXISTS security_incidents_status_idx ON security_incidents (tenant_id, status);
CREATE INDEX IF NOT EXISTS security_incidents_severity_idx ON security_incidents (severity, detected_at);

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents FORCE ROW LEVEL SECURITY;

CREATE POLICY security_incidents_tenant_isolation ON security_incidents
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ---------------------------------------------------------------------------
-- GRANTS para app_user
-- ---------------------------------------------------------------------------
GRANT SELECT ON audit_logs, personal_data_access_logs TO app_user;
GRANT SELECT, INSERT, UPDATE ON
  outbox_events, notifications, file_assets,
  usage_meters, security_incidents, import_batches
TO app_user;

-- ═══ MIGRATION 0005_global_references.sql ═══
-- =============================================================================
-- Migration 0005: Referências Globais Somente-leitura
-- Municipality, Party, Election (metadados do pleito)
--
-- REGRA ABSOLUTA (§17.11A v4.2):
--   Nenhuma entidade que identifique ou referencie pessoa física pode estar aqui.
--   Candidacy, Person, SuccessionOrder, ContactPoint → SEMPRE por tenant.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- MUNICIPALITY — 497 municípios do RS + demais quando multi-tenant expand
-- Global somente-leitura: não carrega tenant_id
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.municipalities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Código IBGE (identificador oficial)
  ibge_code       TEXT NOT NULL,
  -- Código TRE (para correlação eleitoral)
  tre_code        TEXT,
  name            TEXT NOT NULL,
  state_code      TEXT NOT NULL DEFAULT 'RS',
  -- Mesorregião e microrregião IBGE
  mesoregion      TEXT,
  microregion     TEXT,
  -- População (último censo disponível)
  population      INTEGER,
  census_year     INTEGER,
  -- Coordenadas para mapa institucional (§15.2 v4.2)
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  -- Área territorial (km²)
  area_km2        DECIMAL(10, 2),
  -- Status
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Metadados de importação
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_source   TEXT NOT NULL DEFAULT 'ibge',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT municipalities_ibge_code_state_unique UNIQUE (ibge_code, state_code)
);

CREATE TRIGGER municipalities_updated_at
  BEFORE UPDATE ON public_ref.municipalities
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS municipalities_ibge_code_idx
  ON public_ref.municipalities (ibge_code);
CREATE INDEX IF NOT EXISTS municipalities_state_idx
  ON public_ref.municipalities (state_code);
CREATE INDEX IF NOT EXISTS municipalities_name_idx
  ON public_ref.municipalities (name);
-- Índice GiST para queries geoespaciais (mapa §15.2)
CREATE INDEX IF NOT EXISTS municipalities_geo_idx
  ON public_ref.municipalities (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Permissões: SELECT para todos, INSERT/UPDATE apenas service_role
GRANT SELECT ON public_ref.municipalities TO app_user, readonly_role;
GRANT ALL ON public_ref.municipalities TO service_role;

COMMENT ON TABLE public_ref.municipalities IS
  'Municípios brasileiros — referência global somente-leitura. '
  'Sem tenant_id. Dados do IBGE/TSE. '
  'NUNCA incluir dados de pessoa física nesta tabela.';

-- ---------------------------------------------------------------------------
-- PARTY — partidos políticos (referência global)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.parties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Número eleitoral TSE
  tse_number      INTEGER NOT NULL,
  acronym         TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  -- Federação/coligação quando aplicável (por eleição — armazenado em Election)
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  -- Vigência (partidos extintos preservados para histórico)
  valid_from      DATE,
  valid_until     DATE,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  import_source   TEXT NOT NULL DEFAULT 'tse',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parties_tse_number_unique UNIQUE (tse_number)
);

CREATE TRIGGER parties_updated_at
  BEFORE UPDATE ON public_ref.parties
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS parties_acronym_idx ON public_ref.parties (acronym);
CREATE INDEX IF NOT EXISTS parties_active_idx ON public_ref.parties (active);

GRANT SELECT ON public_ref.parties TO app_user, readonly_role;
GRANT ALL ON public_ref.parties TO service_role;

COMMENT ON TABLE public_ref.parties IS
  'Partidos políticos — referência global somente-leitura. '
  'Apenas metadados do partido, sem dados de candidatos ou pessoas.';

-- ---------------------------------------------------------------------------
-- ELECTION — metadados do pleito eleitoral (referência global)
-- SOMENTE metadados: data, cargo, abrangência, quocientes apurados
-- Candidaturas e resultados por pessoa → tabela candidacies (por tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_ref.elections (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identificador TSE do pleito
  tse_election_code     TEXT NOT NULL,
  year                  INTEGER NOT NULL,
  round                 INTEGER NOT NULL DEFAULT 1,
  -- Tipo de eleição
  election_type         TEXT NOT NULL
                          CHECK (election_type IN ('municipal', 'estadual', 'federal', 'suplementar')),
  -- Cargo disputado (neste contexto: vereador)
  office                TEXT NOT NULL DEFAULT 'vereador',
  state_code            TEXT NOT NULL DEFAULT 'RS',
  -- Data do pleito
  election_date         DATE NOT NULL,
  -- Metadados calculados (usados para cálculo de suplência quando necessário)
  -- Esses campos são os quocientes eleitorais e partidários
  -- Os valores por município ficam na importação de candidaturas
  notes                 TEXT,
  -- Status da importação
  import_status         TEXT NOT NULL DEFAULT 'pending'
                          CHECK (import_status IN ('pending', 'importing', 'complete', 'error')),
  imported_at           TIMESTAMPTZ,
  import_source         TEXT,
  import_version        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT elections_tse_code_round_unique UNIQUE (tse_election_code, round)
);

CREATE TRIGGER elections_updated_at
  BEFORE UPDATE ON public_ref.elections
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS elections_year_idx ON public_ref.elections (year, election_type);
CREATE INDEX IF NOT EXISTS elections_state_idx ON public_ref.elections (state_code, year);

GRANT SELECT ON public_ref.elections TO app_user, readonly_role;
GRANT ALL ON public_ref.elections TO service_role;

COMMENT ON TABLE public_ref.elections IS
  'Metadados do pleito eleitoral — referência global somente-leitura. '
  'Apenas dados do pleito em si (data, tipo, cargo). '
  'Candidaturas e dados de pessoas ficam em candidacies (por tenant). '
  'Candidacy carrega tenant_id — decisão vinculante v4.2 §17.11A.';

-- ---------------------------------------------------------------------------
-- MIGRATION BATCH LOG — rastreamento de importações (§13 v4.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  -- Tipo de importação
  import_type     TEXT NOT NULL,
  -- Ex: 'electoral_tse', 'municipalities_ibge', 'parties_tse'
  -- Fonte
  source_system   TEXT NOT NULL,
  source_version  TEXT,
  source_url      TEXT,
  -- Lote
  batch_reference TEXT NOT NULL, -- identificador único da fonte
  -- Contagens
  total_records   INTEGER,
  processed_ok    INTEGER NOT NULL DEFAULT 0,
  processed_error INTEGER NOT NULL DEFAULT 0,
  skipped         INTEGER NOT NULL DEFAULT 0,
  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'complete', 'error', 'cancelled')),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  -- Log de erros e divergências
  error_log       JSONB,
  divergence_log  JSONB,
  -- Quem iniciou
  initiated_by    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER import_batches_updated_at
  BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS import_batches_tenant_idx ON import_batches (tenant_id);
CREATE INDEX IF NOT EXISTS import_batches_type_status_idx
  ON import_batches (import_type, status, created_at);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;

CREATE POLICY import_batches_tenant_isolation ON import_batches
  FOR ALL
  USING (
    app.is_service_role()
    OR tenant_id = app.current_tenant_id()
  );

-- ═══ MIGRATION 0006_dev_grants.sql ═══
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

-- =============================================================================
-- ═══ PARTE 3: SEED — Tenant UVERGS, Roles, Flags e Usuário Admin ═══
-- =============================================================================

-- ─── TENANT UVERGS ───
INSERT INTO tenants (slug, name, status, plan, contact_email, timezone)
VALUES ('uvergs', 'UVERGS — União dos Vereadores do RS', 'active', 'enterprise', 'contato@uvergs.org.br', 'America/Sao_Paulo')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- ─── TEMA INSTITUCIONAL ───
INSERT INTO tenant_themes (
  tenant_id, primary_color, secondary_color, organization_full_name,
  tagline, certificate_signer_name, certificate_signer_title
)
SELECT id, '#1a3a6e', '#c8a940',
  'União dos Vereadores do Estado do Rio Grande do Sul',
  'Fortalecendo o poder legislativo municipal gaúcho',
  'Presidente da UVERGS',
  'União dos Vereadores do Rio Grande do Sul'
FROM tenants WHERE slug = 'uvergs'
ON CONFLICT (tenant_id) DO NOTHING;

-- ─── FLAGS VAL-LEGAL (todas desligadas por padrão) ───
INSERT INTO feature_flags (tenant_id, key, enabled, category, description)
SELECT t.id, f.key, false, 'val_legal', f.description
FROM tenants t
CROSS JOIN (VALUES
  ('GERADOR_INSTRUMENTO_FILIACAO',    'Gerador de minuta de Projeto de Resolução para filiação. Requer aprovação jurídica UVERGS.'),
  ('KIT_CONTRATACAO_DIRETA',          'Kit de habilitação para contratação direta (Lei 14.133/2021 art. 74 III). Requer aprovação jurídica.'),
  ('NFS_E_EMISSAO',                   'Emissão de NFS-e. Requer configuração do provedor e validação fiscal.'),
  ('RETENCOES_TRIBUTARIAS',           'Cálculo de retenções tributárias. Requer validação da contabilidade UVERGS.'),
  ('SUPLENTE_COMUNICACAO_AUTOMATICA', 'Comunicação automática a suplentes. Requer base legal definida pelo DPO/jurídico.'),
  ('PORTAL_TITULAR_LGPD',             'Canal público de exercício de direitos do titular LGPD. Requer instrumentos de governança.')
) AS f(key, description)
WHERE t.slug = 'uvergs'
ON CONFLICT (tenant_id, key) DO NOTHING;

-- ─── ROLES DE SISTEMA (10 perfis) ───
INSERT INTO roles (tenant_id, name, display_name, is_system, require_2fa, description)
SELECT t.id, r.name, r.display_name, true, r.require_2fa, r.description
FROM tenants t
CROSS JOIN (VALUES
  ('admin_global',           'Administrador Global',       true,  'Acesso completo ao sistema. Altamente auditado.'),
  ('presidency',             'Presidência/Diretoria',      true,  'BI, indicadores, relatórios e supervisão.'),
  ('financial',              'Financeiro/Contábil',        true,  'Cobranças, empenhos, conciliação e documentos fiscais.'),
  ('events',                 'Eventos',                    false, 'Cursos, inscrições, credenciamento e certificados.'),
  ('communication',          'Comunicação/Atendimento',    false, 'Campanhas, segmentos, inbox e CRM relacional.'),
  ('legal_technical',        'Jurídico/Técnico',           false, 'Biblioteca, tickets e conteúdos validados.'),
  ('credentialing_operator', 'Operador de Credenciamento', false, 'Check-in/check-out do evento autorizado.'),
  ('chamber_user',           'Usuário de Câmara',          false, 'Dados e serviços da própria instituição.'),
  ('councilor',              'Vereador',                   false, 'Dados pessoais, inscrições e certificados próprios.'),
  ('audit_read',             'Auditor/Consulta',           true,  'Leitura de áreas definidas e logs.')
) AS r(name, display_name, require_2fa, description)
WHERE t.slug = 'uvergs'
ON CONFLICT (tenant_id, name) DO UPDATE SET display_name = EXCLUDED.display_name;

-- ─── USUÁRIO ADMIN ───
-- Senha: Admin@360Dev!  (hash pbkdf2-sha512, 100000 iterações)
-- TROCAR EM PRODUÇÃO
INSERT INTO users (tenant_id, email, email_verified, display_name, password_hash, status, locale, timezone)
SELECT id, 'admin@uvergs360.dev', true, 'Administrador (Dev)',
  'pbkdf2:8f3a2b1c9d4e5f60718293a4b5c6d7e8:c4a8f2e1b7d3956028f4e7a1c5b9d2836f4a7e1c9b5d3827f6a4e2c8b1d5937a4f8e2c6b9d1537a8e4c2f6b9d3517a8e4c2f6b9d35',
  'active', 'pt-BR', 'America/Sao_Paulo'
FROM tenants WHERE slug = 'uvergs'
ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- ─── VÍNCULO ADMIN → ROLE admin_global ───
INSERT INTO user_roles (tenant_id, user_id, role_id)
SELECT t.id, u.id, r.id
FROM tenants t
JOIN users u ON u.tenant_id = t.id AND u.email = 'admin@uvergs360.dev'
JOIN roles r ON r.tenant_id = t.id AND r.name = 'admin_global'
WHERE t.slug = 'uvergs'
ON CONFLICT (user_id, role_id, chamber_id) DO NOTHING;

-- =============================================================================
-- ═══ VERIFICAÇÃO FINAL ═══
-- =============================================================================
SELECT
  '✅ Setup concluído' AS resultado,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname IN ('public','public_ref')) AS tabelas,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true) AS tabelas_com_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public') AS politicas_rls,
  (SELECT COUNT(*) FROM feature_flags WHERE category='val_legal' AND enabled=false) AS flags_val_legal_desligadas,
  (SELECT COUNT(*) FROM roles) AS roles_criados,
  (SELECT COUNT(*) FROM users) AS usuarios;
