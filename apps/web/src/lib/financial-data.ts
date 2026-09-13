import { type AdminDataResult, withAdminRead } from "./admin-data";

const FINANCE_ROLES = ["admin_global", "presidency", "audit_read"];

export type ReceivableStatus = "open" | "overdue" | "partial" | "paid" | "cancelled" | "waived";

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

export interface FinancialDirectory {
  receivables: ReceivableRow[];
  totals: {
    expectedCents: number;
    receivedCents: number;
    overdueCents: number;
    commitmentsCents: number;
  };
}

export async function loadFinancialDirectory(
  search: string,
  status: ReceivableStatus | "all"
): Promise<AdminDataResult<FinancialDirectory>> {
  return withAdminRead(FINANCE_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const receivables = await sql<ReceivableRow[]>`
      SELECT r.id, r.description, r.competence, r.kind, r.status,
        r.due_date AS "dueDate", r.amount_cents AS "amountCents",
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status = 'confirmed'), 0)::int AS "paidCents",
        COALESCE(c.short_name, c.legal_name, pe.preferred_name, pe.full_name, 'Participante de evento') AS "debtorName",
        m.name AS municipality
      FROM receivables r
      LEFT JOIN chambers c ON c.tenant_id = r.tenant_id AND c.id = r.chamber_id
      LEFT JOIN public_ref.municipalities m ON m.id = c.municipality_id
      LEFT JOIN persons pe ON pe.tenant_id = r.tenant_id AND pe.id = r.person_id
      LEFT JOIN payments p ON p.tenant_id = r.tenant_id AND p.receivable_id = r.id
      WHERE (${search.length === 0}
        OR r.description ILIKE ${pattern}
        OR COALESCE(c.short_name, c.legal_name, pe.preferred_name, pe.full_name, '') ILIKE ${pattern})
        AND (${status === "all"} OR r.status = ${status})
      GROUP BY r.id, c.short_name, c.legal_name, pe.preferred_name, pe.full_name, m.name
      ORDER BY r.due_date DESC
      LIMIT 100
    `;

    const [totals] = await sql<FinancialDirectory["totals"][]>`
      SELECT
        COALESCE((SELECT SUM(amount_cents) FROM receivables WHERE status NOT IN ('cancelled', 'waived')), 0)::int AS "expectedCents",
        COALESCE((SELECT SUM(amount_cents) FROM payments WHERE status = 'confirmed'), 0)::int AS "receivedCents",
        COALESCE((SELECT SUM(amount_cents) FROM receivables WHERE status = 'overdue'), 0)::int AS "overdueCents",
        COALESCE((SELECT SUM(amount_cents) FROM commitments WHERE status IN ('planned', 'approved')), 0)::int AS "commitmentsCents"
    `;

    return { receivables, totals: totals ?? { expectedCents: 0, receivedCents: 0, overdueCents: 0, commitmentsCents: 0 } };
  });
}
