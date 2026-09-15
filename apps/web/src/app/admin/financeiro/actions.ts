"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withAdminWrite } from "@/lib/admin-write";
import { isValidIsoDate, parseBrlCents } from "@/lib/financial-validation";

const WRITE_ROLES = ["admin_global", "presidency", "financial"];
type SqlClient = ReturnType<typeof import("postgres")>;
const receivableKinds = ["membership", "event", "service", "other"] as const;
const payableCategories = ["administrative", "events", "services", "taxes", "people", "other"] as const;

const baseSchema = z.object({
  description: z.string().trim().min(3).max(240),
  dueDate: z.string().refine(isValidIsoDate),
  amountCents: z.number().int().positive().max(2_000_000_000),
});

type FinancialView = "receber" | "pagar" | "orcamento";

function finish(view: FinancialView, message: string, error = false): never {
  revalidatePath("/admin/financeiro");
  redirect(`/admin/financeiro?view=${view}&${error ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

export async function createReceivableAction(formData: FormData) {
  const parsed = baseSchema.extend({
    category: z.enum(receivableKinds),
    debtorName: z.string().trim().min(2).max(160),
  }).safeParse({
    description: formData.get("description"), dueDate: formData.get("dueDate"),
    amountCents: parseBrlCents(String(formData.get("amount") ?? "")), category: formData.get("category"),
    debtorName: formData.get("debtorName"),
  });
  if (!parsed.success) finish("receber", "Revise os campos informados.", true);

  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO receivables (tenant_id, debtor_name, kind, description, due_date, amount_cents, status, external_reference)
      VALUES (${context.tenantId}, ${parsed.data.debtorName}, ${parsed.data.category}, ${parsed.data.description},
        ${parsed.data.dueDate}, ${parsed.data.amountCents},
        CASE WHEN ${parsed.data.dueDate}::date < CURRENT_DATE THEN 'overdue' ELSE 'open' END,
        ${`manual-${randomUUID()}`}) RETURNING id
    `;
    await sql`INSERT INTO audit_logs (tenant_id,user_id,correlation_id,action,module,entity_type,entity_id,new_value)
      VALUES (${context.tenantId},${context.userId},${randomUUID()},'create','finance','receivable',${row.id},
        ${sql.json({ ...parsed.data })})`;
  });
  finish("receber", result.error ?? "Conta a receber incluída.", Boolean(result.error));
}

export async function createPayableAction(formData: FormData) {
  const parsed = baseSchema.extend({ category: z.enum(payableCategories) }).safeParse({
    description: formData.get("description"), dueDate: formData.get("dueDate"),
    amountCents: parseBrlCents(String(formData.get("amount") ?? "")), category: formData.get("category"),
  });
  if (!parsed.success) finish("pagar", "Revise os campos informados.", true);

  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const categoryNames: Record<(typeof payableCategories)[number], string> = {
      administrative: "Administrativas", events: "Eventos", services: "Serviços",
      taxes: "Tributos", people: "Pessoal", other: "Outras despesas",
    };
    const accountCode: Record<(typeof payableCategories)[number], string> = {
      administrative: "5.2.01", events: "5.1.01", services: "5.3.01",
      taxes: "5.4.01", people: "5.5.01", other: "5.9.01",
    };
    await sql`INSERT INTO cost_centers (tenant_id,code,name) VALUES (${context.tenantId},'GERAL','Geral')
      ON CONFLICT (tenant_id,code) DO NOTHING`;
    await sql`INSERT INTO accounting_accounts (tenant_id,code,name,nature) VALUES
      (${context.tenantId},${accountCode[parsed.data.category]},${categoryNames[parsed.data.category]},'expense')
      ON CONFLICT (tenant_id,code) DO NOTHING`;
    let [party] = await sql<{ id: string }[]>`SELECT id FROM counterparties
      WHERE tenant_id=${context.tenantId} AND name='Fornecedor não informado' LIMIT 1`;
    if (!party) [party] = await sql<{ id: string }[]>`INSERT INTO counterparties (tenant_id,type,name)
      VALUES (${context.tenantId},'other','Fornecedor não informado') RETURNING id`;
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO payables (tenant_id,counterparty_id,cost_center_id,accounting_account_id,description,due_date,amount_cents,status)
      SELECT ${context.tenantId},${party.id},cc.id,aa.id,${parsed.data.description},${parsed.data.dueDate},${parsed.data.amountCents},
        CASE WHEN ${parsed.data.dueDate}::date < CURRENT_DATE THEN 'overdue' ELSE 'draft' END
      FROM cost_centers cc, accounting_accounts aa
      WHERE cc.tenant_id=${context.tenantId} AND cc.code='GERAL'
        AND aa.tenant_id=${context.tenantId} AND aa.code=${accountCode[parsed.data.category]}
      RETURNING id
    `;
    await sql`INSERT INTO audit_logs (tenant_id,user_id,correlation_id,action,module,entity_type,entity_id,new_value)
      VALUES (${context.tenantId},${context.userId},${randomUUID()},'create','finance','payable',${row.id},
        ${sql.json({ ...parsed.data })})`;
  });
  finish("pagar", result.error ?? "Conta a pagar incluída.", Boolean(result.error));
}

async function deleteTitle(kind: "receivable" | "payable", id: string) {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return "Identificador inválido.";
  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    if (kind === "receivable") {
      const payments = await sql`SELECT 1 FROM payments WHERE tenant_id=${context.tenantId} AND receivable_id=${id} LIMIT 1`;
      if (payments.length) throw new Error("TITLE_HAS_SETTLEMENT");
      const deleted = await sql<{ id: string }[]>`DELETE FROM receivables WHERE tenant_id=${context.tenantId} AND id=${id} RETURNING id`;
      if (!deleted.length) throw new Error("TITLE_NOT_FOUND");
    } else {
      const movements = await sql`SELECT 1 FROM financial_transactions WHERE tenant_id=${context.tenantId} AND payable_id=${id} LIMIT 1`;
      if (movements.length) throw new Error("TITLE_HAS_SETTLEMENT");
      const deleted = await sql<{ id: string }[]>`DELETE FROM payables WHERE tenant_id=${context.tenantId} AND id=${id} RETURNING id`;
      if (!deleted.length) throw new Error("TITLE_NOT_FOUND");
    }
    await sql`INSERT INTO audit_logs (tenant_id,user_id,correlation_id,action,module,entity_type,entity_id)
      VALUES (${context.tenantId},${context.userId},${randomUUID()},'delete','finance',${kind},${id})`;
  });
  return result.error;
}

export async function deleteReceivableAction(formData: FormData) {
  const error = await deleteTitle("receivable", String(formData.get("id") ?? ""));
  finish("receber", error ?? "Conta a receber excluída.", Boolean(error));
}

export async function deletePayableAction(formData: FormData) {
  const error = await deleteTitle("payable", String(formData.get("id") ?? ""));
  finish("pagar", error ?? "Conta a pagar excluída.", Boolean(error));
}

export async function approvePayableAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) finish("pagar", "Identificador inválido.", true);
  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const rows = await sql<{ id: string }[]>`UPDATE payables SET status='approved', approved_by=${context.userId}, approved_at=NOW()
      WHERE tenant_id=${context.tenantId} AND id=${id} AND status IN ('draft','pending_approval','overdue') RETURNING id`;
    if (!rows.length) throw new Error("PAYABLE_NOT_APPROVABLE");
    await auditAction(sql, context, "approve", "payable", id);
  });
  finish("pagar", result.error ?? "Conta aprovada para pagamento.", Boolean(result.error));
}

export async function settleReceivableAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) finish("receber", "Identificador inválido.", true);
  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const [title] = await sql<{ id: string; kind: string; amount_cents: number }[]>`
      SELECT r.id,r.kind,r.amount_cents FROM receivables r
      WHERE r.tenant_id=${context.tenantId} AND r.id=${id} AND r.status IN ('open','overdue','partial')
      FOR UPDATE`;
    if (!title) throw new Error("RECEIVABLE_NOT_SETTLEABLE");
    const [{ paid_cents: paidCents }] = await sql<{ paid_cents: number }[]>`SELECT COALESCE(SUM(amount_cents),0)::int paid_cents
      FROM payments WHERE tenant_id=${context.tenantId} AND receivable_id=${id} AND status='confirmed'`;
    if (paidCents >= title.amount_cents) throw new Error("RECEIVABLE_NOT_SETTLEABLE");
    const remaining = title.amount_cents - paidCents;
    const requested = String(formData.get("amount") ?? "").trim();
    const amount = requested ? parseBrlCents(requested) : remaining;
    if (!amount || amount > remaining) throw new Error("INVALID_SETTLEMENT_AMOUNT");
    const transactionId = await createPostedTransaction(sql, context, {
      type: "inflow", amount, receivableId: id, payableId: null,
      categoryCode: title.kind === "event" ? "4.2.01" : "4.1.01", memo: "Baixa de conta a receber",
    });
    await sql`INSERT INTO payments (tenant_id,receivable_id,amount_cents,paid_at,method,status,idempotency_key,financial_transaction_id)
      VALUES (${context.tenantId},${id},${amount},NOW(),'bank_transfer','confirmed',${`manual-payment-${randomUUID()}`},${transactionId})`;
    await sql`UPDATE receivables SET status=${amount === remaining ? "paid" : "partial"} WHERE tenant_id=${context.tenantId} AND id=${id}`;
    await auditAction(sql, context, "settle", "receivable", id);
  });
  finish("receber", result.error ?? "Recebimento baixado e contabilizado.", Boolean(result.error));
}

export async function settlePayableAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.string().uuid().safeParse(id).success) finish("pagar", "Identificador inválido.", true);
  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const [title] = await sql<{ id: string; amount_cents: number; accounting_account_id: string }[]>`
      SELECT id,amount_cents,accounting_account_id FROM payables
      WHERE tenant_id=${context.tenantId} AND id=${id} AND status IN ('approved','partial') FOR UPDATE`;
    if (!title) throw new Error("PAYABLE_NOT_SETTLEABLE");
    const [{ paid_cents: paidCents }] = await sql<{ paid_cents: number }[]>`SELECT COALESCE(SUM(amount_cents),0)::int paid_cents
      FROM financial_transactions WHERE tenant_id=${context.tenantId} AND payable_id=${id} AND type='outflow' AND status='confirmed'`;
    const remaining = title.amount_cents - paidCents;
    const requested = String(formData.get("amount") ?? "").trim();
    const amount = requested ? parseBrlCents(requested) : remaining;
    if (!amount || amount > remaining) throw new Error("INVALID_SETTLEMENT_AMOUNT");
    await createPostedTransaction(sql, context, {
      type: "outflow", amount, receivableId: null, payableId: id,
      accountingAccountId: title.accounting_account_id, memo: "Baixa de conta a pagar",
    });
    await sql`UPDATE payables SET status=${amount === remaining ? "paid" : "partial"} WHERE tenant_id=${context.tenantId} AND id=${id}`;
    await auditAction(sql, context, "settle", "payable", id);
  });
  finish("pagar", result.error ?? "Pagamento baixado e contabilizado.", Boolean(result.error));
}

export async function createBudgetLineAction(formData: FormData) {
  const parsed = z.object({
    year: z.coerce.number().int().min(2020).max(2200), month: z.coerce.number().int().min(1).max(12),
    nature: z.enum(["revenue", "expense"]), category: z.string().trim().min(2).max(80),
    amountCents: z.number().int().positive(),
  }).safeParse({ year: formData.get("year"), month: formData.get("month"), nature: formData.get("nature"),
    category: formData.get("category"), amountCents: parseBrlCents(String(formData.get("amount") ?? "")) });
  if (!parsed.success) finish("orcamento", "Revise os dados do orçamento.", true);
  const result = await withAdminWrite(WRITE_ROLES, async (sql, context) => {
    const code = `${parsed.data.nature === "revenue" ? "4.9" : "5.9"}.${String(parsed.data.category.toLowerCase().split("").reduce((sum,char)=>sum+char.charCodeAt(0),0) % 90 + 10)}`;
    await sql`INSERT INTO cost_centers (tenant_id,code,name) VALUES (${context.tenantId},'GERAL','Geral') ON CONFLICT (tenant_id,code) DO NOTHING`;
    await sql`INSERT INTO accounting_accounts (tenant_id,code,name,nature) VALUES (${context.tenantId},${code},${parsed.data.category},${parsed.data.nature}) ON CONFLICT (tenant_id,code) DO UPDATE SET name=EXCLUDED.name`;
    const [budget] = await sql<{ id: string }[]>`INSERT INTO budgets (tenant_id,year,version,status,approved_at)
      VALUES (${context.tenantId},${parsed.data.year},1,'approved',NOW()) ON CONFLICT (tenant_id,year,version)
      DO UPDATE SET status='approved',approved_at=COALESCE(budgets.approved_at,NOW()) RETURNING id`;
    await sql`INSERT INTO budget_lines (tenant_id,budget_id,accounting_account_id,cost_center_id,month,planned_cents)
      SELECT ${context.tenantId},${budget.id},aa.id,cc.id,${parsed.data.month},${parsed.data.amountCents}
      FROM accounting_accounts aa,cost_centers cc WHERE aa.tenant_id=${context.tenantId} AND aa.code=${code}
        AND cc.tenant_id=${context.tenantId} AND cc.code='GERAL'
      ON CONFLICT (tenant_id,budget_id,accounting_account_id,cost_center_id,project_id,month)
      DO UPDATE SET planned_cents=EXCLUDED.planned_cents`;
    await auditAction(sql, context, "upsert", "budget", budget.id);
  });
  finish("orcamento", result.error ?? "Orçamento atualizado.", Boolean(result.error));
}

// Conciliação bancária removida da experiência do produto (escopo v2).
// Antes havia aqui: createStatementEntryAction, matchStatementEntryAction,
// ignoreStatementEntryAction — todas operavam sobre bank_statement_entries,
// que permanece dormente no banco (ver docs/UVERGS_360_PRODUCT_SCOPE_V2.md).

interface TransactionInput {
  type: "inflow" | "outflow";
  amount: number;
  receivableId: string | null;
  payableId: string | null;
  categoryCode?: string;
  accountingAccountId?: string;
  memo: string;
}

async function createPostedTransaction(sql: SqlClient, context: { tenantId: string }, input: TransactionInput) {
  await sql`INSERT INTO financial_accounts (tenant_id,name,type,opening_balance_cents)
    SELECT ${context.tenantId},'Conta principal','checking',0
    WHERE NOT EXISTS (SELECT 1 FROM financial_accounts WHERE tenant_id=${context.tenantId} AND active)`;
  await sql`INSERT INTO cost_centers (tenant_id,code,name) VALUES (${context.tenantId},'GERAL','Geral')
    ON CONFLICT (tenant_id,code) DO NOTHING`;
  await sql`INSERT INTO accounting_accounts (tenant_id,code,name,nature)
    VALUES (${context.tenantId},'1.1.01','Caixa e equivalentes de caixa','asset')
    ON CONFLICT (tenant_id,code) DO NOTHING`;
  if (input.categoryCode) {
    await sql`INSERT INTO accounting_accounts (tenant_id,code,name,nature)
      VALUES (${context.tenantId},${input.categoryCode},'Receitas operacionais','revenue')
      ON CONFLICT (tenant_id,code) DO NOTHING`;
  }
  const [dimensions] = await sql<{ bank_id: string; cost_center_id: string; cash_account_id: string; category_account_id: string }[]>`
    SELECT fa.id bank_id,cc.id cost_center_id,cash.id cash_account_id,category.id category_account_id
    FROM financial_accounts fa,cost_centers cc,accounting_accounts cash,accounting_accounts category
    WHERE fa.tenant_id=${context.tenantId} AND fa.active
      AND cc.tenant_id=fa.tenant_id AND cc.code='GERAL'
      AND cash.tenant_id=fa.tenant_id AND cash.code='1.1.01'
      AND category.tenant_id=fa.tenant_id
      AND category.id=COALESCE(${input.accountingAccountId ?? null}::uuid,
        (SELECT id FROM accounting_accounts WHERE tenant_id=${context.tenantId} AND code=${input.categoryCode ?? "4.1.01"}))
    ORDER BY fa.created_at LIMIT 1`;
  if (!dimensions) throw new Error("FINANCIAL_DIMENSIONS_MISSING");
  const [transaction] = await sql<{ id: string }[]>`INSERT INTO financial_transactions
    (tenant_id,financial_account_id,receivable_id,payable_id,cost_center_id,accounting_account_id,type,amount_cents,occurred_at,status,idempotency_key,memo)
    VALUES (${context.tenantId},${dimensions.bank_id},${input.receivableId},${input.payableId},${dimensions.cost_center_id},
      ${dimensions.category_account_id},${input.type},${input.amount},NOW(),'confirmed',${`manual-transaction-${randomUUID()}`},${input.memo}) RETURNING id`;
  const [entry] = await sql<{ id: string }[]>`INSERT INTO journal_entries
    (tenant_id,transaction_id,entry_date,memo,source_type,source_id,status)
    VALUES (${context.tenantId},${transaction.id},CURRENT_DATE,${input.memo},'financial_transaction',${transaction.id},'draft') RETURNING id`;
  if (input.type === "inflow") {
    await sql`INSERT INTO journal_lines (tenant_id,entry_id,accounting_account_id,cost_center_id,debit_cents,credit_cents) VALUES
      (${context.tenantId},${entry.id},${dimensions.cash_account_id},${dimensions.cost_center_id},${input.amount},0),
      (${context.tenantId},${entry.id},${dimensions.category_account_id},${dimensions.cost_center_id},0,${input.amount})`;
  } else {
    await sql`INSERT INTO journal_lines (tenant_id,entry_id,accounting_account_id,cost_center_id,debit_cents,credit_cents) VALUES
      (${context.tenantId},${entry.id},${dimensions.category_account_id},${dimensions.cost_center_id},${input.amount},0),
      (${context.tenantId},${entry.id},${dimensions.cash_account_id},${dimensions.cost_center_id},0,${input.amount})`;
  }
  await sql`UPDATE journal_entries SET status='posted',posted_at=NOW() WHERE tenant_id=${context.tenantId} AND id=${entry.id}`;
  return transaction.id;
}

async function auditAction(sql: SqlClient, context: { tenantId: string; userId: string }, action: string, entityType: string, entityId: string) {
  await sql`INSERT INTO audit_logs (tenant_id,user_id,correlation_id,action,module,entity_type,entity_id)
    VALUES (${context.tenantId},${context.userId},${randomUUID()},${action},'finance',${entityType},${entityId})`;
}
