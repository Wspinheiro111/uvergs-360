-- =============================================================================

DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_id_id_unique') THEN
    ALTER TABLE users ADD CONSTRAINT users_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_assets_tenant_id_id_unique') THEN
    ALTER TABLE file_assets ADD CONSTRAINT file_assets_tenant_id_id_unique UNIQUE (tenant_id, id);
  END IF;
END
$body$;
-- Migration 0009: eventos, inscrições, presença e certificados (F1)
-- Todas as entidades operacionais são isoladas por tenant; os vínculos entre
-- tabelas usam chaves compostas para impedir referências cruzadas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'course' CHECK (type IN ('course', 'seminar', 'congress', 'meeting', 'workshop', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'registration_open', 'full', 'in_progress', 'completed', 'cancelled')),
  format TEXT NOT NULL DEFAULT 'in_person' CHECK (format IN ('in_person', 'online', 'hybrid')),
  venue_name TEXT,
  municipality_name TEXT,
  address_line TEXT,
  online_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  workload_minutes INTEGER NOT NULL DEFAULT 0 CHECK (workload_minutes >= 0),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT events_created_by_tenant_fk FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT events_period_check CHECK (ends_at > starts_at),
  CONSTRAINT events_registration_period_check CHECK (
    registration_opens_at IS NULL OR registration_closes_at IS NULL OR registration_closes_at >= registration_opens_at
  ),
  CONSTRAINT events_tenant_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT events_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS events_tenant_status_start_idx ON events (tenant_id, status, starts_at);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
CREATE POLICY events_tenant_isolation ON events FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS event_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  speaker_name TEXT,
  room_name TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT event_sessions_event_tenant_fk FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT event_sessions_period_check CHECK (ends_at > starts_at),
  CONSTRAINT event_sessions_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TRIGGER event_sessions_updated_at BEFORE UPDATE ON event_sessions
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS event_sessions_event_start_idx ON event_sessions (tenant_id, event_id, starts_at);
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY event_sessions_tenant_isolation ON event_sessions FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL,
  person_id UUID,
  chamber_id UUID,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'waitlist', 'cancelled', 'attended', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('exempt', 'pending', 'paid', 'refunded', 'overdue')),
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT registrations_event_tenant_fk FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT registrations_person_tenant_fk FOREIGN KEY (tenant_id, person_id) REFERENCES persons(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT registrations_chamber_tenant_fk FOREIGN KEY (tenant_id, chamber_id) REFERENCES chambers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT registrations_check_out_check CHECK (checked_out_at IS NULL OR (checked_in_at IS NOT NULL AND checked_out_at >= checked_in_at)),
  CONSTRAINT registrations_tenant_event_email_unique UNIQUE (tenant_id, event_id, attendee_email),
  CONSTRAINT registrations_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS registrations_event_status_idx ON registrations (tenant_id, event_id, status);
CREATE INDEX IF NOT EXISTS registrations_chamber_idx ON registrations (tenant_id, chamber_id);
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations FORCE ROW LEVEL SECURITY;
CREATE POLICY registrations_tenant_isolation ON registrations FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL,
  registration_id UUID NOT NULL,
  asset_id UUID,
  verification_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'revoked')),
  workload_minutes INTEGER NOT NULL DEFAULT 0 CHECK (workload_minutes >= 0),
  issued_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certificates_event_tenant_fk FOREIGN KEY (tenant_id, event_id) REFERENCES events(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT certificates_registration_tenant_fk FOREIGN KEY (tenant_id, registration_id) REFERENCES registrations(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT certificates_asset_tenant_fk FOREIGN KEY (tenant_id, asset_id) REFERENCES file_assets(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT certificates_tenant_registration_unique UNIQUE (tenant_id, registration_id),
  CONSTRAINT certificates_verification_code_unique UNIQUE (verification_code),
  CONSTRAINT certificates_revocation_check CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);

CREATE TRIGGER certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS certificates_event_status_idx ON certificates (tenant_id, event_id, status);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates FORCE ROW LEVEL SECURITY;
CREATE POLICY certificates_tenant_isolation ON certificates FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

GRANT SELECT ON events, event_sessions, registrations, certificates TO app_user, readonly_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON events, event_sessions, registrations, certificates TO service_role;

COMMENT ON TABLE events IS 'Agenda institucional de cursos e eventos, isolada por tenant.';
COMMENT ON TABLE registrations IS 'Inscrições, pagamentos e presença dos participantes.';
COMMENT ON TABLE certificates IS 'Certificados verificáveis vinculados a inscrições elegíveis.';
