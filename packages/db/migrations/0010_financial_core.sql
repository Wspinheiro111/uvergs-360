-- =============================================================================
-- Migration 0010: contas a receber, pagamentos e compromissos (F1/F4)
-- Valores monetários são inteiros em centavos. Pagamentos têm chave de
-- idempotência e todos os vínculos operacionais preservam o tenant.
-- =============================================================================

CREATE TABLE IF NOT EXISTS receivables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  chamber_id UUID,
  person_id UUID,
  registration_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('membership', 'event', 'service', 'other')),
  description TEXT NOT NULL,
  competence TEXT,
  due_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'overdue', 'partial', 'paid', 'cancelled', 'waived')),
  external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT receivables_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT receivables_tenant_external_ref_unique UNIQUE (tenant_id, external_reference),
  CONSTRAINT receivables_chamber_tenant_fk FOREIGN KEY (tenant_id, chamber_id) REFERENCES chambers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT receivables_person_tenant_fk FOREIGN KEY (tenant_id, person_id) REFERENCES persons(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT receivables_registration_tenant_fk FOREIGN KEY (tenant_id, registration_id) REFERENCES registrations(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT receivables_subject_check CHECK (chamber_id IS NOT NULL OR person_id IS NOT NULL OR registration_id IS NOT NULL)
);

CREATE TRIGGER receivables_updated_at BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS receivables_tenant_status_due_idx ON receivables (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS receivables_chamber_idx ON receivables (tenant_id, chamber_id, due_date DESC);
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables FORCE ROW LEVEL SECURITY;
CREATE POLICY receivables_tenant_isolation ON receivables FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  receivable_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_at TIMESTAMPTZ NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('pix', 'boleto', 'bank_transfer', 'card', 'cash', 'other')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'refunded', 'reversed')),
  provider_reference TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_receivable_tenant_fk FOREIGN KEY (tenant_id, receivable_id) REFERENCES receivables(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payments_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS payments_receivable_idx ON payments (tenant_id, receivable_id, paid_at DESC);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
CREATE POLICY payments_tenant_isolation ON payments FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

CREATE TABLE IF NOT EXISTS commitments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commitments_payment_check CHECK ((status = 'paid') = (paid_at IS NOT NULL))
);

CREATE TRIGGER commitments_updated_at BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE INDEX IF NOT EXISTS commitments_tenant_status_due_idx ON commitments (tenant_id, status, due_date);
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments FORCE ROW LEVEL SECURITY;
CREATE POLICY commitments_tenant_isolation ON commitments FOR ALL
  USING (app.is_service_role() OR tenant_id = app.current_tenant_id())
  WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id());

GRANT SELECT ON receivables, payments, commitments TO app_user, readonly_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON receivables, payments, commitments TO service_role;

COMMENT ON TABLE receivables IS 'Receitas previstas da associação, cursos e serviços, em centavos.';
COMMENT ON TABLE payments IS 'Baixas financeiras idempotentes vinculadas a contas a receber.';
COMMENT ON TABLE commitments IS 'Compromissos e despesas planejadas pela organização.';
