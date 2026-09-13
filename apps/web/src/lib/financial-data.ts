import { type AdminDataResult, withAdminRead } from "./admin-data";

const FINANCE_ROLES = ["admin_global", "presidency", "audit_read"];
export type ReceivableStatus = "open" | "overdue" | "partial" | "paid" | "cancelled" | "waived";
export type PayableStatus = "draft" | "pending_approval" | "approved" | "partial" | "paid" | "overdue" | "cancelled";

export interface ReceivableRow {
  id: string;
  description: string;
  competence: string | null;
  kind: "membership" | "event" | "service" | "other";
  status: ReceivableStatus;
  dueDate: Date;
  amountCents: number;
  paidCents: number;
  debtorName: string;
  municipality: string | null;
}

export interface PayableRow {
  id: string;
  description: string;
  counterpartyName: string;
  costCenterName: string;
  projectName: string | null;
  dueDate: Date;
  amountCents: number;
  paidCents: number;
  status: PayableStatus;
}

export interface CashPositionRow {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  balanceCents: number;
}

export interface MonthlyResultRow {
  month: Date;
  revenueCents: number;
  expenseCents: number;
  surplusCents: number;
}

export interface FinancialDirectory {
  receivables: ReceivableRow[];
  payables: PayableRow[];
  cashPositions: CashPositionRow[];
  monthlyResults: MonthlyResultRow[];
  totals: {
    cashBalanceCents: number;
    expectedCents: number;
    receivedCents: number;
    receivablesOverdueCents: number;
    payablesOpenCents: number;
    payablesOverdueCents: number;
    commitmentsCents: number;
    budgetPlannedCents: number;
    budgetActualCents: number;
    unreconciled: number;
    restrictedProjects: number;
  };
}

export async function loadFinancialDirectory(
  search: string,
  receivableStatus: ReceivableStatus | "all",
  payableStatus: PayableStatus | "all"
): Promise<AdminDataResult<FinancialDirectory>> {
  return withAdminRead(FINANCE_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const [receivables, payables, cashPositions, monthlyResults, totalsRows] = await Promise.all([
      sql<ReceivableRow[]>`
        SELECT r.id, r.description, r.competence, r.kind, r.status,
          r.due_date AS "dueDate", r.amount_cents AS "amountCents",
          COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'confirmed'), 0)::int AS "paidCents",
          COALESCE(c.short_name, c.legal_name, pe.preferred_name, pe.full_name, r.debtor_name, 'Participante de evento') AS "debtorName",
          m.name AS municipality
        FROM receivables r
        LEFT JOIN chambers c ON c.tenant_id=r.tenant_id AND c.id=r.chamber_id
        LEFT JOIN public_ref.municipalities m ON m.id=c.municipality_id
        LEFT JOIN persons pe ON pe.tenant_id=r.tenant_id AND pe.id=r.person_id
        LEFT JOIN payments p ON p.tenant_id=r.tenant_id AND p.receivable_id=r.id
        WHERE (${search.length === 0} OR r.description ILIKE ${pattern}
          OR COALESCE(c.short_name, c.legal_name, pe.preferred_name, pe.full_name, r.debtor_name, '') ILIKE ${pattern})
          AND (${receivableStatus === "all"} OR r.status=${receivableStatus})
        GROUP BY r.id, c.short_name, c.legal_name, pe.preferred_name, pe.full_name, r.debtor_name, m.name
        ORDER BY r.due_date DESC LIMIT 100
      `,
      sql<PayableRow[]>`
        SELECT p.id, p.description, cp.name AS "counterpartyName", cc.name AS "costCenterName",
          fp.name AS "projectName", p.due_date AS "dueDate", p.amount_cents AS "amountCents",
          COALESCE(SUM(ft.amount_cents) FILTER (WHERE ft.status='confirmed'), 0)::int AS "paidCents", p.status
        FROM payables p
        JOIN counterparties cp ON cp.tenant_id=p.tenant_id AND cp.id=p.counterparty_id
        JOIN cost_centers cc ON cc.tenant_id=p.tenant_id AND cc.id=p.cost_center_id
        LEFT JOIN funding_projects fp ON fp.tenant_id=p.tenant_id AND fp.id=p.project_id
        LEFT JOIN financial_transactions ft ON ft.tenant_id=p.tenant_id AND ft.payable_id=p.id AND ft.type='outflow'
        WHERE (${search.length === 0} OR p.description ILIKE ${pattern} OR cp.name ILIKE ${pattern})
          AND (${payableStatus === "all"} OR p.status=${payableStatus})
        GROUP BY p.id, cp.name, cc.name, fp.name
        ORDER BY p.due_date DESC LIMIT 100
      `,
      sql<CashPositionRow[]>`
        SELECT financial_account_id AS id, name, type, bank_name AS "bankName", balance_cents::int AS "balanceCents"
        FROM financial_cash_position ORDER BY name
      `,
      sql<MonthlyResultRow[]>`
        SELECT month, revenue_cents::int AS "revenueCents", expense_cents::int AS "expenseCents", surplus_cents::int AS "surplusCents"
        FROM financial_monthly_result ORDER BY month DESC LIMIT 12
      `,
      sql<FinancialDirectory["totals"][]>`
        SELECT
          COALESCE((SELECT SUM(balance_cents) FROM financial_cash_position), 0)::int AS "cashBalanceCents",
          COALESCE((SELECT SUM(amount_cents) FROM receivables WHERE status NOT IN ('cancelled','waived')), 0)::int AS "expectedCents",
          COALESCE((SELECT SUM(amount_cents) FROM payments WHERE status='confirmed'), 0)::int AS "receivedCents",
          COALESCE((SELECT SUM(amount_cents) FROM receivables WHERE status='overdue'), 0)::int AS "receivablesOverdueCents",
          COALESCE((SELECT SUM(amount_cents) FROM payables WHERE status IN ('draft','pending_approval','approved','partial','overdue')), 0)::int AS "payablesOpenCents",
          COALESCE((SELECT SUM(amount_cents) FROM payables WHERE status='overdue'), 0)::int AS "payablesOverdueCents",
          COALESCE((SELECT SUM(amount_cents) FROM commitments WHERE status IN ('planned','approved')), 0)::int AS "commitmentsCents",
          COALESCE((SELECT SUM(planned_cents) FROM financial_budget_vs_actual), 0)::int AS "budgetPlannedCents",
          COALESCE((SELECT SUM(actual_cents) FROM financial_budget_vs_actual), 0)::int AS "budgetActualCents",
          (SELECT COUNT(*)::int FROM bank_statement_entries WHERE status='unmatched') AS unreconciled,
          (SELECT COUNT(*)::int FROM funding_projects WHERE restricted_funds AND status='active') AS "restrictedProjects"
      `,
    ]);
    return {
      receivables, payables, cashPositions, monthlyResults,
      totals: totalsRows[0] ?? {
        cashBalanceCents: 0, expectedCents: 0, receivedCents: 0, receivablesOverdueCents: 0,
        payablesOpenCents: 0, payablesOverdueCents: 0, commitmentsCents: 0,
        budgetPlannedCents: 0, budgetActualCents: 0, unreconciled: 0, restrictedProjects: 0,
      },
    };
  });
}
