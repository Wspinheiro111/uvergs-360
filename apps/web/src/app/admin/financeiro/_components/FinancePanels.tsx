"use client";

import type { FinancialDirectory, PayableStatus, ReceivableStatus } from "@/lib/financial-data";

import { createPayableAction, createReceivableAction, deletePayableAction, deleteReceivableAction } from "../actions";

const RECEIVABLE_LABELS: Record<ReceivableStatus, string> = { open: "Em aberto", overdue: "Vencida", partial: "Parcial", paid: "Quitada", cancelled: "Cancelada", waived: "Isenta" };
const PAYABLE_LABELS: Record<PayableStatus, string> = { draft: "Rascunho", pending_approval: "Aprovação", approved: "Aprovada", partial: "Parcial", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada" };
const STATUS_TONE: Record<string, string> = { open: "bg-blue-50 text-blue-700", draft: "bg-slate-100 text-slate-600", pending_approval: "bg-amber-50 text-amber-700", approved: "bg-blue-50 text-blue-700", overdue: "bg-red-50 text-red-700", partial: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700", cancelled: "bg-slate-100 text-slate-600", waived: "bg-violet-50 text-violet-700" };

export function currency(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function date(value: Date) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value); }

export function ReceivablesPanel({ data }: { data: FinancialDirectory["receivables"] }) {
  return <div className="space-y-6"><EntryForm kind="receivable" /><section className="surface-panel overflow-hidden"><div className="border-b border-slate-200 p-6"><span className="eyebrow">Receitas</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Contas a receber e anuidades</h2></div><div className="divide-y divide-slate-100">{data.length === 0 && <EmptyState />}{data.map(item => <article key={item.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[1.4fr_.65fr_.65fr_auto_auto] lg:items-center"><div><h3 className="font-semibold text-slate-900">{item.debtorName}</h3><p className="mt-1 text-sm text-slate-500">{item.description}{item.competence ? ` · ${item.competence}` : ""}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Vencimento</p><p className="mt-1 text-sm text-slate-700">{date(item.dueDate)}</p></div><div><p className="font-semibold text-slate-900">{currency(item.amountCents)}</p><p className="text-[11px] text-slate-400">{currency(item.paidCents)} recebido</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_TONE[item.status]}`}>{RECEIVABLE_LABELS[item.status]}</span><DeleteButton id={item.id} action={deleteReceivableAction} disabled={item.paidCents > 0} /></article>)}</div></section></div>;
}

export function PayablesPanel({ data }: { data: FinancialDirectory["payables"] }) {
  return <div className="space-y-6"><EntryForm kind="payable" /><section className="surface-panel overflow-hidden"><div className="border-b border-slate-200 p-6"><span className="eyebrow">Despesas</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Contas a pagar e aprovações</h2></div><div className="divide-y divide-slate-100">{data.length === 0 && <EmptyState />}{data.map(item => <article key={item.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[1.35fr_.75fr_.6fr_auto_auto] lg:items-center"><div><h3 className="font-semibold text-slate-900">{item.counterpartyName}</h3><p className="mt-1 text-sm text-slate-500">{item.description}</p><p className="mt-1 text-[11px] text-slate-400">{item.costCenterName}{item.projectName ? ` · ${item.projectName}` : ""}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Vencimento</p><p className="mt-1 text-sm text-slate-700">{date(item.dueDate)}</p></div><div><p className="font-semibold text-slate-900">{currency(item.amountCents)}</p><p className="text-[11px] text-slate-400">{currency(item.paidCents)} pago</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_TONE[item.status]}`}>{PAYABLE_LABELS[item.status]}</span><DeleteButton id={item.id} action={deletePayableAction} disabled={item.paidCents > 0} /></article>)}</div></section></div>;
}

function EntryForm({ kind }: { kind: "receivable" | "payable" }) {
  const receiving = kind === "receivable";
  const categories = receiving
    ? [["membership", "Contribuição/Anuidade"], ["event", "Evento"], ["service", "Serviço"], ["other", "Outras receitas"]]
    : [["administrative", "Administrativa"], ["events", "Eventos"], ["services", "Serviços"], ["taxes", "Tributos"], ["people", "Pessoal"], ["other", "Outras despesas"]];
  return <form action={receiving ? createReceivableAction : createPayableAction} className="surface-panel p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="eyebrow">Novo lançamento</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Incluir conta a {receiving ? "receber" : "pagar"}</h2></div><p className="text-xs text-slate-400">Campos com * são obrigatórios</p></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {receiving && <Field label="Pagador *"><input name="debtorName" required minLength={2} maxLength={160} placeholder="Nome do pagador" className="form-input" /></Field>}
      <Field label="Descrição *" wide={!receiving}><input name="description" required minLength={3} maxLength={240} placeholder="Descrição do lançamento" className="form-input" /></Field>
      <Field label="Categoria *"><select name="category" required className="form-input">{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
      <Field label="Vencimento *"><input type="date" name="dueDate" required className="form-input" /></Field>
      <Field label="Valor (R$) *"><input name="amount" required inputMode="decimal" placeholder="0,00" pattern="[0-9.,]+" className="form-input" /></Field>
    </div>
    <div className="mt-5 flex justify-end"><button type="submit" className="rounded-xl bg-[#0b4b7e] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#083b65]">Incluir lançamento</button></div>
  </form>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? "xl:col-span-2" : ""}`}><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}

function DeleteButton({ id, action, disabled }: { id: string; action: (data: FormData) => Promise<void>; disabled: boolean }) {
  return <form action={action} onSubmit={(event) => { if (!confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) event.preventDefault(); }}><input type="hidden" name="id" value={id} /><button type="submit" disabled={disabled} title={disabled ? "Lançamentos com baixa não podem ser excluídos" : "Excluir lançamento"} className="rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300">Excluir</button></form>;
}

function EmptyState() { return <p className="px-6 py-10 text-center text-sm text-slate-400">Nenhum lançamento encontrado.</p>; }

export function OverviewPanels({ directory }: { directory: FinancialDirectory }) {
  const latest = directory.monthlyResults[0];
  const max = Math.max(...directory.monthlyResults.flatMap(item => [item.revenueCents, item.expenseCents]), 1);
  return <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
    <section className="surface-panel p-6"><div className="flex items-end justify-between"><div><span className="eyebrow">Resultado gerencial</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Receitas x despesas</h2></div>{latest && <span className={`text-sm font-bold ${latest.surplusCents >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currency(latest.surplusCents)} no mês</span>}</div><div className="mt-7 space-y-5">{directory.monthlyResults.slice(0, 6).reverse().map(item => <div key={item.month.toString()} className="grid grid-cols-[52px_1fr] items-center gap-3"><span className="text-xs font-medium uppercase text-slate-400">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" }).format(item.month)}</span><div className="space-y-1.5"><div className="h-2 rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(item.revenueCents / max * 100)}%` }} /></div><div className="h-2 rounded-full bg-rose-100"><div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.round(item.expenseCents / max * 100)}%` }} /></div></div></div>)}</div><div className="mt-6 flex gap-4 text-xs text-slate-500"><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />Receitas</span><span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-400" />Despesas</span></div></section>
    <section className="surface-panel p-6"><span className="eyebrow">Disponibilidades</span><h2 className="mt-1 text-xl font-semibold text-slate-950">Caixa e contas bancárias</h2><div className="mt-5 space-y-3">{directory.cashPositions.map(account => <article key={account.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white font-bold text-blue-700 shadow-sm">$</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{account.name}</p><p className="text-[11px] text-slate-400">{account.bankName ?? "Caixa interno"}</p></div><p className="text-sm font-bold text-slate-900">{currency(account.balanceCents)}</p></article>)}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-amber-50 p-4"><p className="text-2xl font-bold text-amber-700">{directory.totals.unreconciled}</p><p className="text-xs text-amber-700/70">itens para conciliar</p></div><div className="rounded-2xl bg-blue-50 p-4"><p className="text-2xl font-bold text-blue-700">{directory.totals.restrictedProjects}</p><p className="text-xs text-blue-700/70">projetos vinculados</p></div></div></section>
  </div>;
}

const REPORTS = [
  ["Demonstração do Resultado", "Receitas, despesas e superávit/déficit por período"],
  ["Fluxo de Caixa", "Realizado e projetado por conta bancária"],
  ["Balanço Patrimonial", "Ativos, passivos e patrimônio social"],
  ["Mutações do Patrimônio", "Movimentação do patrimônio social"],
  ["Orçado x Realizado", "Conta, centro de custo, projeto e mês"],
  ["Inadimplência Associativa", "Câmara, faixa de atraso e evolução"],
  ["Contas a Pagar/Receber", "Posição, vencimentos e baixas"],
  ["Prestação de Contas", "Recursos vinculados, documentos e execução"],
  ["Conciliação Bancária", "Extrato, correspondências e pendências"],
] as const;

export function ReportsPanel({ directory }: { directory: FinancialDirectory }) {
  const execution = directory.totals.budgetPlannedCents ? Math.round(directory.totals.budgetActualCents / directory.totals.budgetPlannedCents * 100) : 0;
  return <div className="space-y-6"><section className="grid gap-4 md:grid-cols-3"><article className="metric-card metric-blue"><p className="text-xs uppercase tracking-wider text-slate-500">Orçamento aprovado</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.budgetPlannedCents)}</p></article><article className="metric-card metric-green"><p className="text-xs uppercase tracking-wider text-slate-500">Realizado</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.budgetActualCents)}</p></article><article className="metric-card metric-gold"><p className="text-xs uppercase tracking-wider text-slate-500">Execução</p><p className="mt-3 text-2xl font-bold text-slate-950">{execution}%</p></article></section><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{REPORTS.map(([title, description]) => <article key={title} className="surface-panel p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">▥</div><h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-500">{description}</p><span className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Base integrada</span></article>)}</section></div>;
}
