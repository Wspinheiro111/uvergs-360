import { withAdminRead } from "@/lib/admin-data";

const FINANCE_ROLES = ["admin_global", "presidency", "financial", "audit_read"];
const REPORTS = ["dre", "balancete", "orcamento", "receber", "pagar", "conciliacao"] as const;
type Report = typeof REPORTS[number];
type Cell = string | number | Date | null;

function isReport(value: string | null): value is Report {
  return REPORTS.includes(value as Report);
}

function csvCell(value: Cell): string {
  const formatted = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${formatted.replaceAll('"', '""')}"`;
}

function csv(rows: Record<string, Cell>[]): string {
  if (!rows[0]) return "sem_dados\n";
  const columns = Object.keys(rows[0]);
  return [columns.map(csvCell).join(";"), ...rows.map(row => columns.map(column => csvCell(row[column])).join(";"))].join("\n");
}

export async function GET(request: Request) {
  const report = new URL(request.url).searchParams.get("report");
  if (!isReport(report)) return Response.json({ error: "Relatório inválido." }, { status: 400 });

  const result = await withAdminRead(FINANCE_ROLES, async (sql) => {
    if (report === "dre") return sql<Record<string, Cell>[]>`
      SELECT TO_CHAR(month,'YYYY-MM') competencia, revenue_cents receitas_centavos,
        expense_cents despesas_centavos, surplus_cents resultado_centavos
      FROM financial_monthly_result ORDER BY month DESC`;
    if (report === "balancete") return sql<Record<string, Cell>[]>`
      SELECT code codigo,name conta,nature natureza,debit_cents debitos_centavos,
        credit_cents creditos_centavos,balance_cents saldo_centavos
      FROM financial_trial_balance ORDER BY code`;
    if (report === "orcamento") return sql<Record<string, Cell>[]>`
      SELECT year ano,month mes,aa.code codigo_conta,aa.name conta,cc.name centro_custo,
        planned_cents planejado_centavos,actual_cents realizado_centavos
      FROM financial_budget_vs_actual b
      JOIN accounting_accounts aa ON aa.tenant_id=b.tenant_id AND aa.id=b.accounting_account_id
      JOIN cost_centers cc ON cc.tenant_id=b.tenant_id AND cc.id=b.cost_center_id
      ORDER BY year DESC,month DESC,aa.code`;
    if (report === "receber") return sql<Record<string, Cell>[]>`
      SELECT r.debtor_name pagador,r.kind categoria,r.description descricao,r.due_date vencimento,
        r.amount_cents valor_centavos,r.status,
        COALESCE(SUM(p.amount_cents) FILTER (WHERE p.status='confirmed'),0) recebido_centavos
      FROM receivables r LEFT JOIN payments p ON p.tenant_id=r.tenant_id AND p.receivable_id=r.id
      GROUP BY r.id ORDER BY r.due_date`;
    if (report === "pagar") return sql<Record<string, Cell>[]>`
      SELECT cp.name fornecedor,p.description descricao,p.due_date vencimento,p.amount_cents valor_centavos,
        p.status,COALESCE(SUM(ft.amount_cents) FILTER (WHERE ft.status='confirmed'),0) pago_centavos
      FROM payables p JOIN counterparties cp ON cp.tenant_id=p.tenant_id AND cp.id=p.counterparty_id
      LEFT JOIN financial_transactions ft ON ft.tenant_id=p.tenant_id AND ft.payable_id=p.id
      GROUP BY p.id,cp.name ORDER BY p.due_date`;
    return sql<Record<string, Cell>[]>`
      SELECT posted_at data,description descricao,amount_cents valor_centavos,status,transaction_id movimentacao
      FROM bank_statement_entries ORDER BY posted_at DESC`;
  });

  if (!result.data) return Response.json({ error: result.error }, { status: result.error.includes("permissão") ? 403 : 500 });
  return new Response(`\uFEFF${csv(result.data)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uvergs-${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
