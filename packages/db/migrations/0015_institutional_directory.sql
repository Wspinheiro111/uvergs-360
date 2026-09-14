ALTER TABLE chambers
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS transparency_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_quality TEXT NOT NULL DEFAULT 'pending'
    CHECK (data_quality IN ('verified','partial','pending','divergent'));
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS electoral_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS public_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_phone BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;
ALTER TABLE mandates
  ADD COLUMN IF NOT EXISTS substitute_rank INTEGER CHECK (substitute_rank BETWEEN 1 AND 99),
  ADD COLUMN IF NOT EXISTS election_status TEXT CHECK (election_status IS NULL OR election_status IN ('elected','alternate','appointed','unknown')),
  ADD COLUMN IF NOT EXISTS vote_count INTEGER CHECK (vote_count IS NULL OR vote_count >= 0),
  ADD COLUMN IF NOT EXISTS current_exercise BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS institutional_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  municipality_id UUID REFERENCES public_ref.municipalities(id) ON DELETE RESTRICT,
  chamber_id UUID,
  source_type TEXT NOT NULL CHECK (source_type IN ('ibge','tse_open_data','divulgacand','chamber_portal','transparency_portal','manual')),
  name TEXT NOT NULL, url TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ, last_success_at TIMESTAMPTZ, last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT institutional_sources_chamber_fk FOREIGN KEY (tenant_id,chamber_id) REFERENCES chambers(tenant_id,id) ON DELETE RESTRICT,
  CONSTRAINT institutional_sources_tenant_url_unique UNIQUE (tenant_id,url)
);
CREATE TABLE IF NOT EXISTS institutional_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  source_id UUID NOT NULL REFERENCES institutional_sources(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','review','applied','failed','cancelled')),
  election_year INTEGER CHECK (election_year IS NULL OR election_year BETWEEN 2000 AND 2200),
  municipality_ibge_code TEXT, total_items INTEGER NOT NULL DEFAULT 0,
  accepted_items INTEGER NOT NULL DEFAULT 0, rejected_items INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT institutional_imports_tenant_id_id_unique UNIQUE (tenant_id,id)
);
CREATE TABLE IF NOT EXISTS institutional_import_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  import_id UUID NOT NULL, entity_type TEXT NOT NULL CHECK (entity_type IN ('chamber','person','mandate','contact')),
  external_id TEXT, operation TEXT NOT NULL CHECK (operation IN ('create','update','conflict','unchanged')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','applied')),
  confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb, proposed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT institutional_import_items_import_fk FOREIGN KEY (tenant_id,import_id) REFERENCES institutional_imports(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS institutional_sources_tenant_idx ON institutional_sources(tenant_id,source_type,active);
CREATE INDEX IF NOT EXISTS institutional_imports_tenant_idx ON institutional_imports(tenant_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS institutional_import_items_review_idx ON institutional_import_items(tenant_id,status,import_id);
CREATE UNIQUE INDEX IF NOT EXISTS mandates_substitute_rank_unique ON mandates(tenant_id,chamber_id,election_id,substitute_rank) WHERE substitute_rank IS NOT NULL;
CREATE TRIGGER institutional_sources_updated_at BEFORE UPDATE ON institutional_sources FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
ALTER TABLE institutional_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE institutional_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE institutional_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutional_import_items FORCE ROW LEVEL SECURITY;
CREATE POLICY institutional_sources_tenant_isolation ON institutional_sources FOR ALL USING (app.is_service_role() OR tenant_id=app.current_tenant_id()) WITH CHECK (app.is_service_role() OR tenant_id=app.current_tenant_id());
CREATE POLICY institutional_imports_tenant_isolation ON institutional_imports FOR ALL USING (app.is_service_role() OR tenant_id=app.current_tenant_id()) WITH CHECK (app.is_service_role() OR tenant_id=app.current_tenant_id());
CREATE POLICY institutional_import_items_tenant_isolation ON institutional_import_items FOR ALL USING (app.is_service_role() OR tenant_id=app.current_tenant_id()) WITH CHECK (app.is_service_role() OR tenant_id=app.current_tenant_id());
GRANT SELECT ON institutional_sources,institutional_imports,institutional_import_items TO app_user,readonly_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON chambers,persons,mandates,institutional_sources,institutional_imports,institutional_import_items TO app_writer;
