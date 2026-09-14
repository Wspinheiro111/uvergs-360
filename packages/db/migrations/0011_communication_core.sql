-- =============================================================================
-- Migration 0011: campanhas, mensagens e preferências de contato (F5)
-- O canal, a base legal, a supressão e a idempotência ficam registrados.
-- =============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled')),
  audience TEXT NOT NULL DEFAULT 'custom' CHECK (audience IN ('all', 'affiliated_chambers', 'prospects', 'councilors', 'event_attendees', 'custom')),
  subject TEXT,
  content TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'legitimate_interest', 'contract', 'public_interest')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT campaigns_created_by_tenant_fk FOREIGN KEY (tenant_id, created_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT campaigns_schedule_check CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS campaigns_tenant_status_schedule_idx ON campaigns (tenant_id, status, scheduled_at);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
CREATE POLICY campaigns_tenant_isolation ON campaigns FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL,
  recipient_name TEXT,
  recipient_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed', 'suppressed')),
  idempotency_key TEXT NOT NULL,
  provider_message_id TEXT,
  failure_code TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_messages_campaign_tenant_fk FOREIGN KEY (tenant_id, campaign_id) REFERENCES campaigns(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT campaign_messages_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT campaign_messages_delivery_check CHECK (delivered_at IS NULL OR sent_at IS NOT NULL),
  CONSTRAINT campaign_messages_read_check CHECK (read_at IS NULL OR delivered_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS campaign_messages_campaign_status_idx ON campaign_messages (tenant_id, campaign_id, status);
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY campaign_messages_tenant_isolation ON campaign_messages FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS contact_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  address TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms', 'push')),
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  source TEXT,
  consent_evidence TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contact_preferences_tenant_address_channel_unique UNIQUE (tenant_id, address, channel)
);

CREATE TRIGGER contact_preferences_updated_at BEFORE UPDATE ON contact_preferences FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS contact_preferences_tenant_status_idx ON contact_preferences (tenant_id, status);
ALTER TABLE contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_preferences FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_preferences_tenant_isolation ON contact_preferences FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

GRANT SELECT ON campaigns, campaign_messages, contact_preferences TO app_user, readonly_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns, campaign_messages, contact_preferences TO service_role;

COMMENT ON TABLE campaigns IS 'Campanhas multicanal com audiência e base legal explícitas.';
COMMENT ON TABLE campaign_messages IS 'Entregas idempotentes e rastreáveis por destinatário.';
COMMENT ON TABLE contact_preferences IS 'Preferências, opt-out e evidências de consentimento por canal.';
