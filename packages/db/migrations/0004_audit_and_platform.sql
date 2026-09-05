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
