-- Escrita financeira preservando RLS e imutabilidade do diário contábil.
DO $body$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_writer') THEN
    CREATE ROLE app_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$body$;

GRANT app_writer TO service_role;
GRANT USAGE ON SCHEMA public, app, public_ref TO app_writer;
GRANT SELECT ON tenants, users, chambers, persons, registrations, commitments TO app_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  receivables, payments, financial_accounts, cost_centers, funding_projects,
  accounting_accounts, counterparties, payables, financial_transactions,
  budgets, budget_lines, bank_statement_entries, journal_entries, journal_lines
TO app_writer;

DROP POLICY IF EXISTS audit_logs_service_insert ON audit_logs;
CREATE POLICY audit_logs_service_insert ON audit_logs FOR INSERT WITH CHECK (
  app.is_service_role()
  OR (current_setting('role', true) = 'app_writer' AND tenant_id = app.current_tenant_id())
);
GRANT INSERT ON audit_logs TO app_writer;

CREATE OR REPLACE FUNCTION app.guard_posted_journal_entry() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$
BEGIN
  IF OLD.status IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Posted journal entries are immutable; create a reversing entry';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$body$;

CREATE OR REPLACE FUNCTION app.guard_posted_journal_line() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $body$
DECLARE target_entry UUID; target_status TEXT;
BEGIN
  target_entry := CASE WHEN TG_OP = 'DELETE' THEN OLD.entry_id ELSE COALESCE(NEW.entry_id, OLD.entry_id) END;
  SELECT status INTO target_status FROM journal_entries WHERE id = target_entry;
  IF target_status IN ('posted', 'reversed') THEN
    RAISE EXCEPTION 'Lines of posted journal entries are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$body$;

DROP TRIGGER IF EXISTS journal_entries_immutability ON journal_entries;
CREATE TRIGGER journal_entries_immutability
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION app.guard_posted_journal_entry();
DROP TRIGGER IF EXISTS journal_lines_immutability ON journal_lines;
CREATE TRIGGER journal_lines_immutability
  BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION app.guard_posted_journal_line();

CREATE OR REPLACE VIEW financial_budget_vs_actual WITH (security_invoker = true) AS
SELECT bl.tenant_id, b.year, bl.month, bl.accounting_account_id, bl.cost_center_id, bl.project_id,
  SUM(bl.planned_cents)::bigint AS planned_cents,
  COALESCE((SELECT SUM(ft.amount_cents) FROM financial_transactions ft
    WHERE ft.tenant_id=bl.tenant_id AND ft.accounting_account_id=bl.accounting_account_id
      AND ft.cost_center_id=bl.cost_center_id AND ft.project_id IS NOT DISTINCT FROM bl.project_id
      AND EXTRACT(YEAR FROM ft.occurred_at)=b.year AND EXTRACT(MONTH FROM ft.occurred_at)=bl.month
      AND ft.status='confirmed'), 0)::bigint AS actual_cents
FROM budget_lines bl JOIN budgets b ON b.tenant_id=bl.tenant_id AND b.id=bl.budget_id AND b.status='approved'
GROUP BY bl.tenant_id, b.year, bl.month, bl.accounting_account_id, bl.cost_center_id, bl.project_id;

GRANT SELECT ON financial_budget_vs_actual TO app_user, app_writer, readonly_role, service_role;

CREATE OR REPLACE VIEW financial_balance_sheet WITH (security_invoker = true) AS
SELECT tenant_id, nature,
  SUM(CASE WHEN nature='asset' THEN balance_cents ELSE -balance_cents END)::bigint AS amount_cents
FROM financial_trial_balance
WHERE nature IN ('asset', 'liability', 'equity')
GROUP BY tenant_id, nature
UNION ALL
SELECT tenant_id, 'current_result'::text AS nature,
  -SUM(balance_cents)::bigint AS amount_cents
FROM financial_trial_balance
WHERE nature IN ('revenue', 'expense')
GROUP BY tenant_id;

GRANT SELECT ON financial_balance_sheet TO app_user, app_writer, readonly_role, service_role;

DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM journal_entries je
    LEFT JOIN journal_lines jl ON jl.tenant_id=je.tenant_id AND jl.entry_id=je.id
    WHERE je.status='posted'
    GROUP BY je.id
    HAVING COALESCE(SUM(jl.debit_cents),0) = 0
      OR COALESCE(SUM(jl.debit_cents),0) <> COALESCE(SUM(jl.credit_cents),0)
  ) THEN
    RAISE EXCEPTION 'Existing posted journal entries are unbalanced; migration aborted';
  END IF;
END
$body$;
