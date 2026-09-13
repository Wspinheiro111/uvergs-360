"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { withAdminWrite } from "@/lib/admin-write";

const WRITE_ROLES = ["admin_global", "presidency"];
const receivableKinds = ["membership", "event", "service", "other"] as const;
const payableCategories = ["administrative", "events", "services", "taxes", "people", "other"] as const;

function cents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").replace(/\s|R\$/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

const baseSchema = z.object({
  description: z.string().trim().min(3).max(240),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountCents: z.number().int().positive().max(2_000_000_000),
});

function finish(view: "receber" | "pagar", message: string, error = false): never {
  revalidatePath("/admin/financeiro");
  redirect(`/admin/financeiro?view=${view}&${error ? "error" : "notice"}=${encodeURIComponent(message)}`);
}

export async function createReceivableAction(formData: FormData) {
  const parsed = baseSchema.extend({
    category: z.enum(receivableKinds),
    debtorName: z.string().trim().min(2).max(160),
  }).safeParse({
    description: formData.get("description"), dueDate: formData.get("dueDate"),
    amountCents: cents(formData.get("amount")), category: formData.get("category"),
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
    amountCents: cents(formData.get("amount")), category: formData.get("category"),
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
