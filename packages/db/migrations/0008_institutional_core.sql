-- =============================================================================
-- Migration 0008: núcleo institucional (F1)
-- Municípios são referência global. Câmaras, pessoas e mandatos são isolados
-- por tenant e começam em modo de consulta na interface administrativa.
-- =============================================================================

CREATE TABLE IF NOT EXISTS chambers (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  municipality_id     UUID NOT NULL REFERENCES public_ref.municipalities(id) ON DELETE RESTRICT,
  legal_name          TEXT NOT NULL,
  short_name          TEXT,
  cnpj                 TEXT,
  email                TEXT,
  phone                TEXT,
  website_url          TEXT,
  address_line         TEXT,
  postal_code          TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'pending')),
  affiliation_status   TEXT NOT NULL DEFAULT 'prospect'
                        CHECK (affiliation_status IN ('affiliated', 'prospect', 'inactive')),
  affiliated_at        DATE,
  notes                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chambers_tenant_municipality_unique UNIQUE (tenant_id, municipality_id),
  CONSTRAINT chambers_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TRIGGER chambers_updated_at
  BEFORE UPDATE ON chambers
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS chambers_tenant_status_idx
  ON chambers (tenant_id, status);
CREATE INDEX IF NOT EXISTS chambers_tenant_affiliation_idx
  ON chambers (tenant_id, affiliation_status);
CREATE INDEX IF NOT EXISTS chambers_municipality_idx
  ON chambers (municipality_id);

ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambers FORCE ROW LEVEL SECURITY;

CREATE POLICY chambers_tenant_isolation ON chambers
  FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS persons (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  full_name           TEXT NOT NULL,
  preferred_name      TEXT,
  email               TEXT,
  phone               TEXT,
  avatar_url          TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'deceased')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT persons_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TRIGGER persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS persons_tenant_name_idx
  ON persons (tenant_id, full_name);
CREATE INDEX IF NOT EXISTS persons_tenant_status_idx
  ON persons (tenant_id, status) WHERE deleted_at IS NULL;

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons FORCE ROW LEVEL SECURITY;

CREATE POLICY persons_tenant_isolation ON persons
  FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS mandates (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  person_id           UUID NOT NULL,
  chamber_id          UUID NOT NULL,
  party_id            UUID REFERENCES public_ref.parties(id) ON DELETE RESTRICT,
  election_id         UUID REFERENCES public_ref.elections(id) ON DELETE RESTRICT,
  office              TEXT NOT NULL DEFAULT 'councilor'
                        CHECK (office IN ('councilor', 'president', 'vice_president', 'substitute')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'licensed', 'completed', 'revoked')),
  started_at          DATE NOT NULL,
  ended_at            DATE,
  legislature_label   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mandates_person_tenant_fk
    FOREIGN KEY (tenant_id, person_id) REFERENCES persons(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT mandates_chamber_tenant_fk
    FOREIGN KEY (tenant_id, chamber_id) REFERENCES chambers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT mandates_period_check CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TRIGGER mandates_updated_at
  BEFORE UPDATE ON mandates
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX IF NOT EXISTS mandates_tenant_status_idx
  ON mandates (tenant_id, status);
CREATE INDEX IF NOT EXISTS mandates_chamber_idx
  ON mandates (tenant_id, chamber_id, status);
CREATE INDEX IF NOT EXISTS mandates_person_idx
  ON mandates (tenant_id, person_id, started_at DESC);

ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandates FORCE ROW LEVEL SECURITY;

CREATE POLICY mandates_tenant_isolation ON mandates
  FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_chamber_tenant_fk'
  ) THEN
    ALTER TABLE user_roles
      ADD CONSTRAINT user_roles_chamber_tenant_fk
      FOREIGN KEY (tenant_id, chamber_id)
      REFERENCES chambers(tenant_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$body$;

GRANT SELECT ON chambers, persons, mandates TO app_user, readonly_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON chambers, persons, mandates TO service_role;

COMMENT ON TABLE chambers IS 'Câmaras municipais acompanhadas pela UVERGS, isoladas por tenant.';
COMMENT ON TABLE persons IS 'Pessoas institucionais do tenant; dados pessoais nunca são referência global.';
COMMENT ON TABLE mandates IS 'Mandatos e vínculos políticos entre pessoa e câmara, isolados por tenant.';
