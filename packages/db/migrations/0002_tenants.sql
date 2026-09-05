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
