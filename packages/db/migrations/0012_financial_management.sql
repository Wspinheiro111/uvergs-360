-- =============================================================================
-- Migration 0012: gestão financeira integrada e relatórios gerenciais
-- Plano de contas, bancos/caixa, centros de custo, projetos com recursos
-- vinculados, contas a pagar, razão financeiro, orçamento e conciliação.
-- =============================================================================

ALTER TABLE commitments
  ADD CONSTRAINT commitments_tenant_id_id_unique UNIQUE (tenant_id, id);

CREATE TABLE financial_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'checking', 'savings', 'investment')),
  bank_name TEXT,
  account_last4 TEXT,
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_accounts_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE cost_centers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cost_centers_tenant_code_unique UNIQUE (tenant_id, code),
  CONSTRAINT cost_centers_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE funding_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('own', 'public_partnership', 'sponsorship', 'donation', 'grant')),
  restricted_funds BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at DATE,
  ends_at DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT funding_projects_period_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT funding_projects_tenant_code_unique UNIQUE (tenant_id, code),
  CONSTRAINT funding_projects_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE accounting_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  parent_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  nature TEXT NOT NULL CHECK (nature IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  posting_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT accounting_accounts_tenant_code_unique UNIQUE (tenant_id, code),
  CONSTRAINT accounting_accounts_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT accounting_accounts_parent_tenant_fk FOREIGN KEY (tenant_id, parent_id) REFERENCES accounting_accounts(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE counterparties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('supplier', 'partner', 'sponsor', 'donor', 'employee', 'other')),
  name TEXT NOT NULL,
  document_masked TEXT,
  email TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT counterparties_tenant_id_id_unique UNIQUE (tenant_id, id)
);

CREATE TABLE payables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  counterparty_id UUID NOT NULL,
  commitment_id UUID,
  cost_center_id UUID NOT NULL,
  project_id UUID,
  accounting_account_id UUID NOT NULL,
  description TEXT NOT NULL,
  document_number TEXT,
  competence TEXT,
  due_date DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'partial', 'paid', 'overdue', 'cancelled')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payables_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT payables_counterparty_tenant_fk FOREIGN KEY (tenant_id, counterparty_id) REFERENCES counterparties(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_commitment_tenant_fk FOREIGN KEY (tenant_id, commitment_id) REFERENCES commitments(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_cost_center_tenant_fk FOREIGN KEY (tenant_id, cost_center_id) REFERENCES cost_centers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_project_tenant_fk FOREIGN KEY (tenant_id, project_id) REFERENCES funding_projects(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_account_tenant_fk FOREIGN KEY (tenant_id, accounting_account_id) REFERENCES accounting_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_approved_by_tenant_fk FOREIGN KEY (tenant_id, approved_by) REFERENCES users(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT payables_approval_check CHECK (status NOT IN ('approved', 'partial', 'paid') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  financial_account_id UUID NOT NULL,
  receivable_id UUID,
  payable_id UUID,
  cost_center_id UUID NOT NULL,
  project_id UUID,
  accounting_account_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow', 'transfer_in', 'transfer_out')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'reversed')),
  idempotency_key TEXT NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT financial_transactions_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT financial_transactions_tenant_idempotency_unique UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT financial_transactions_bank_account_tenant_fk FOREIGN KEY (tenant_id, financial_account_id) REFERENCES financial_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_receivable_tenant_fk FOREIGN KEY (tenant_id, receivable_id) REFERENCES receivables(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_payable_tenant_fk FOREIGN KEY (tenant_id, payable_id) REFERENCES payables(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_cost_center_tenant_fk FOREIGN KEY (tenant_id, cost_center_id) REFERENCES cost_centers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_project_tenant_fk FOREIGN KEY (tenant_id, project_id) REFERENCES funding_projects(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_accounting_account_tenant_fk FOREIGN KEY (tenant_id, accounting_account_id) REFERENCES accounting_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT financial_transactions_origin_check CHECK (
    type IN ('transfer_in', 'transfer_out') OR num_nonnulls(receivable_id, payable_id) = 1
  )
);

ALTER TABLE payments ADD COLUMN financial_transaction_id UUID;
ALTER TABLE payments ADD CONSTRAINT payments_financial_transaction_tenant_fk
  FOREIGN KEY (tenant_id, financial_transaction_id) REFERENCES financial_transactions(tenant_id, id) ON DELETE RESTRICT;

CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'closed')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_tenant_year_version_unique UNIQUE (tenant_id, year, version),
  CONSTRAINT budgets_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT budgets_approval_check CHECK (status = 'draft' OR approved_at IS NOT NULL)
);

CREATE TABLE budget_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  budget_id UUID NOT NULL,
  accounting_account_id UUID NOT NULL,
  cost_center_id UUID NOT NULL,
  project_id UUID,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_cents INTEGER NOT NULL CHECK (planned_cents >= 0),
  CONSTRAINT budget_lines_budget_tenant_fk FOREIGN KEY (tenant_id, budget_id) REFERENCES budgets(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT budget_lines_account_tenant_fk FOREIGN KEY (tenant_id, accounting_account_id) REFERENCES accounting_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT budget_lines_cost_center_tenant_fk FOREIGN KEY (tenant_id, cost_center_id) REFERENCES cost_centers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT budget_lines_project_tenant_fk FOREIGN KEY (tenant_id, project_id) REFERENCES funding_projects(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT budget_lines_dimension_unique UNIQUE NULLS NOT DISTINCT (tenant_id, budget_id, accounting_account_id, cost_center_id, project_id, month)
);

CREATE TABLE bank_statement_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  financial_account_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  posted_at DATE NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'ignored')),
  transaction_id UUID,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bank_statement_entries_account_tenant_fk FOREIGN KEY (tenant_id, financial_account_id) REFERENCES financial_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT bank_statement_entries_transaction_tenant_fk FOREIGN KEY (tenant_id, transaction_id) REFERENCES financial_transactions(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT bank_statement_entries_tenant_account_external_unique UNIQUE (tenant_id, financial_account_id, external_id),
  CONSTRAINT bank_statement_entries_match_check CHECK ((status = 'matched') = (transaction_id IS NOT NULL))
);

CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_id UUID,
  entry_date DATE NOT NULL,
  memo TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journal_entries_tenant_id_id_unique UNIQUE (tenant_id, id),
  CONSTRAINT journal_entries_transaction_tenant_fk FOREIGN KEY (tenant_id, transaction_id) REFERENCES financial_transactions(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT journal_entries_posted_check CHECK (status = 'draft' OR posted_at IS NOT NULL)
);

CREATE TABLE journal_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  entry_id UUID NOT NULL,
  accounting_account_id UUID NOT NULL,
  cost_center_id UUID,
  project_id UUID,
  debit_cents INTEGER NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents INTEGER NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  memo TEXT,
  CONSTRAINT journal_lines_entry_tenant_fk FOREIGN KEY (tenant_id, entry_id) REFERENCES journal_entries(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT journal_lines_account_tenant_fk FOREIGN KEY (tenant_id, accounting_account_id) REFERENCES accounting_accounts(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT journal_lines_cost_center_tenant_fk FOREIGN KEY (tenant_id, cost_center_id) REFERENCES cost_centers(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT journal_lines_project_tenant_fk FOREIGN KEY (tenant_id, project_id) REFERENCES funding_projects(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT journal_lines_side_check CHECK ((debit_cents > 0 AND credit_cents = 0) OR (credit_cents > 0 AND debit_cents = 0))
);

CREATE FUNCTION app.assert_journal_balanced() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$
DECLARE target_entry UUID; entry_status TEXT; total_debit BIGINT; total_credit BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'journal_entries' THEN
    target_entry := NEW.id;
  ELSE
    target_entry := COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;
  SELECT status INTO entry_status FROM journal_entries WHERE id=target_entry;
  IF entry_status = 'posted' THEN
    SELECT COALESCE(SUM(debit_cents),0), COALESCE(SUM(credit_cents),0)
      INTO total_debit, total_credit FROM journal_lines WHERE entry_id=target_entry;
    IF total_debit = 0 OR total_debit <> total_credit THEN
      RAISE EXCEPTION 'Journal entry % is not balanced', target_entry;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END
$body$;

CREATE CONSTRAINT TRIGGER journal_lines_balance_check
  AFTER INSERT OR UPDATE OR DELETE ON journal_lines DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.assert_journal_balanced();
CREATE CONSTRAINT TRIGGER journal_entries_balance_check
  AFTER INSERT OR UPDATE OF status ON journal_entries DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.assert_journal_balanced();

CREATE TRIGGER financial_accounts_updated_at BEFORE UPDATE ON financial_accounts FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER payables_updated_at BEFORE UPDATE ON payables FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE INDEX payables_tenant_status_due_idx ON payables (tenant_id, status, due_date);
CREATE INDEX financial_transactions_account_date_idx ON financial_transactions (tenant_id, financial_account_id, occurred_at DESC);
CREATE INDEX financial_transactions_dimensions_idx ON financial_transactions (tenant_id, accounting_account_id, cost_center_id, project_id, occurred_at DESC);
CREATE INDEX bank_statement_entries_tenant_status_idx ON bank_statement_entries (tenant_id, status, posted_at DESC);
CREATE INDEX journal_entries_tenant_date_idx ON journal_entries (tenant_id, entry_date DESC);
CREATE INDEX journal_lines_entry_idx ON journal_lines (tenant_id, entry_id);

DO $body$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'financial_accounts', 'cost_centers', 'funding_projects', 'accounting_accounts',
    'counterparties', 'payables', 'financial_transactions', 'budgets',
    'budget_lines', 'bank_statement_entries', 'journal_entries', 'journal_lines'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (app.is_service_role() OR tenant_id = app.current_tenant_id()) WITH CHECK (app.is_service_role() OR tenant_id = app.current_tenant_id())',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END
$body$;

CREATE VIEW financial_cash_position WITH (security_invoker = true) AS
SELECT a.tenant_id, a.id AS financial_account_id, a.name, a.type, a.bank_name,
  a.opening_balance_cents + COALESCE(SUM(CASE
    WHEN t.status <> 'confirmed' THEN 0
    WHEN t.type IN ('inflow', 'transfer_in') THEN t.amount_cents
    ELSE -t.amount_cents END), 0)::bigint AS balance_cents
FROM financial_accounts a
LEFT JOIN financial_transactions t ON t.tenant_id=a.tenant_id AND t.financial_account_id=a.id
WHERE a.active
GROUP BY a.tenant_id, a.id;

CREATE VIEW financial_monthly_result WITH (security_invoker = true) AS
SELECT t.tenant_id, date_trunc('month', t.occurred_at)::date AS month,
  COALESCE(SUM(t.amount_cents) FILTER (WHERE aa.nature='revenue' AND t.status='confirmed'), 0)::bigint AS revenue_cents,
  COALESCE(SUM(t.amount_cents) FILTER (WHERE aa.nature='expense' AND t.status='confirmed'), 0)::bigint AS expense_cents,
  COALESCE(SUM(CASE WHEN aa.nature='revenue' AND t.status='confirmed' THEN t.amount_cents WHEN aa.nature='expense' AND t.status='confirmed' THEN -t.amount_cents ELSE 0 END), 0)::bigint AS surplus_cents
FROM financial_transactions t
JOIN accounting_accounts aa ON aa.tenant_id=t.tenant_id AND aa.id=t.accounting_account_id
GROUP BY t.tenant_id, date_trunc('month', t.occurred_at);

CREATE VIEW financial_budget_vs_actual WITH (security_invoker = true) AS
SELECT bl.tenant_id, b.year, bl.month, bl.accounting_account_id, bl.cost_center_id, bl.project_id,
  SUM(bl.planned_cents)::bigint AS planned_cents,
  COALESCE((SELECT SUM(ft.amount_cents) FROM financial_transactions ft
    WHERE ft.tenant_id=bl.tenant_id AND ft.accounting_account_id=bl.accounting_account_id
      AND ft.cost_center_id=bl.cost_center_id AND ft.project_id IS NOT DISTINCT FROM bl.project_id
      AND EXTRACT(YEAR FROM ft.occurred_at)=b.year AND EXTRACT(MONTH FROM ft.occurred_at)=bl.month
      AND ft.status='confirmed'), 0)::bigint AS actual_cents
FROM budget_lines bl JOIN budgets b ON b.tenant_id=bl.tenant_id AND b.id=bl.budget_id
GROUP BY bl.tenant_id, b.year, bl.month, bl.accounting_account_id, bl.cost_center_id, bl.project_id;

CREATE VIEW financial_trial_balance WITH (security_invoker = true) AS
SELECT jl.tenant_id, aa.id AS accounting_account_id, aa.code, aa.name, aa.nature,
  SUM(jl.debit_cents)::bigint AS debit_cents,
  SUM(jl.credit_cents)::bigint AS credit_cents,
  SUM(jl.debit_cents - jl.credit_cents)::bigint AS balance_cents
FROM journal_lines jl
JOIN journal_entries je ON je.tenant_id=jl.tenant_id AND je.id=jl.entry_id AND je.status='posted'
JOIN accounting_accounts aa ON aa.tenant_id=jl.tenant_id AND aa.id=jl.accounting_account_id
GROUP BY jl.tenant_id, aa.id;

CREATE VIEW financial_balance_sheet WITH (security_invoker = true) AS
SELECT tenant_id, nature,
  SUM(CASE WHEN nature='asset' THEN balance_cents ELSE -balance_cents END)::bigint AS amount_cents
FROM financial_trial_balance
WHERE nature IN ('asset', 'liability', 'equity')
GROUP BY tenant_id, nature;

CREATE VIEW financial_equity_changes WITH (security_invoker = true) AS
SELECT jl.tenant_id, date_trunc('month', je.entry_date)::date AS month,
  SUM(jl.credit_cents - jl.debit_cents)::bigint AS change_cents
FROM journal_lines jl
JOIN journal_entries je ON je.tenant_id=jl.tenant_id AND je.id=jl.entry_id AND je.status='posted'
JOIN accounting_accounts aa ON aa.tenant_id=jl.tenant_id AND aa.id=jl.accounting_account_id AND aa.nature='equity'
GROUP BY jl.tenant_id, date_trunc('month', je.entry_date);

GRANT SELECT ON financial_accounts, cost_centers, funding_projects, accounting_accounts, counterparties,
  payables, financial_transactions, budgets, budget_lines, bank_statement_entries,
  journal_entries, journal_lines, financial_cash_position, financial_monthly_result,
  financial_budget_vs_actual, financial_trial_balance, financial_balance_sheet,
  financial_equity_changes TO app_user, readonly_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON financial_accounts, cost_centers, funding_projects, accounting_accounts,
  counterparties, payables, financial_transactions, budgets, budget_lines, bank_statement_entries,
  journal_entries, journal_lines TO service_role;

COMMENT ON VIEW financial_monthly_result IS 'Resultado gerencial mensal (receitas, despesas e superávit/déficit).';
COMMENT ON VIEW financial_budget_vs_actual IS 'Orçamento versus realizado por conta, centro de custo, projeto e mês.';
