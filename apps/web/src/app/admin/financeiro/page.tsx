import Link from "next/link";

import { loadFinancialDirectory, type PayableStatus, type ReceivableStatus } from "@/lib/financial-data";

import { DataNotice } from "../_components/DataNotice";
import { currency, OverviewPanels, PayablesPanel, ReceivablesPanel, ReportsPanel } from "./_components/FinancePanels";

const VIEWS = [
  ["overview", "Visão geral"], ["receber", "Contas a receber"], ["pagar", "Contas a pagar"], ["relatorios", "DRE e relatórios"],
] as const;
type FinancialView = typeof VIEWS[number][0];
const RECEIVABLE_STATUSES = new Set<ReceivableStatus>(["open", "overdue", "partial", "paid", "cancelled", "waived"]);
const PAYABLE_STATUSES = new Set<PayableStatus>(["draft", "pending_approval", "approved", "partial", "paid", "overdue", "cancelled"]);

interface FinancialPageProps { searchParams: Promise<{ view?: string; q?: string; receber?: string; pagar?: string; notice?: string; error?: string }>; }
function viewOf(value?: string): FinancialView { return VIEWS.some(([key]) => key === value) ? value as FinancialView : "overview"; }

export default async function FinancialPage({ searchParams }: FinancialPageProps) {
  const params = await searchParams;
  const view = viewOf(params.view);
  const search = params.q?.trim().slice(0, 100) ?? "";
  const receivableStatus = RECEIVABLE_STATUSES.has(params.receber as ReceivableStatus) ? params.receber as ReceivableStatus : "all";
  const payableStatus = PAYABLE_STATUSES.has(params.pagar as PayableStatus) ? params.pagar as PayableStatus : "all";
  const result = await loadFinancialDirectory(search, receivableStatus, payableStatus);
  const directory = result.data;

  return <div className="page-canvas">
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#063b72] via-[#087c91] to-[#15a274] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(4,90,104,.8)] sm:px-9">
      <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-3xl"><span className="eyebrow-light">Gestão financeira integrada</span><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Do lançamento à prestação de contas.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">Receber, pagar, conciliar, orçar e prestar contas em um único fluxo, conectado às Câmaras, eventos, projetos e documentos.</p></div>{directory && <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur"><p className="text-[10px] uppercase tracking-wider text-emerald-100">Saldo disponível</p><p className="mt-1 text-2xl font-bold">{currency(directory.totals.cashBalanceCents)}</p></div>}</div>
    </section>

    <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Áreas financeiras">{VIEWS.map(([key, label]) => <Link key={key} href={`/admin/financeiro?view=${key}`} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${view === key ? "bg-[#0b4b7e] text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>{label}</Link>)}</nav>
    {result.error && <div className="mt-6"><DataNotice message={result.error} /></div>}
    {params.notice && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{params.notice}</div>}
    {params.error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{params.error}</div>}

    {directory && <div className="mt-6 space-y-6">
      <section className="metric-grid"><article className="metric-card metric-blue"><p className="text-xs uppercase tracking-wider text-slate-500">A receber</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.expectedCents)}</p><p className="mt-1 text-xs text-slate-500">{currency(directory.totals.receivablesOverdueCents)} vencido</p></article><article className="metric-card metric-green"><p className="text-xs uppercase tracking-wider text-slate-500">Recebido</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.receivedCents)}</p><p className="mt-1 text-xs text-slate-500">baixas confirmadas</p></article><article className="metric-card metric-gold"><p className="text-xs uppercase tracking-wider text-slate-500">A pagar</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.payablesOpenCents)}</p><p className="mt-1 text-xs text-slate-500">{currency(directory.totals.payablesOverdueCents)} vencido</p></article><article className="metric-card metric-violet"><p className="text-xs uppercase tracking-wider text-slate-500">Compromissos</p><p className="mt-3 text-2xl font-bold text-slate-950">{currency(directory.totals.commitmentsCents)}</p><p className="mt-1 text-xs text-slate-500">planejados e aprovados</p></article></section>
      {view === "overview" && <OverviewPanels directory={directory} />}
      {view === "receber" && <ReceivablesPanel data={directory.receivables} />}
      {view === "pagar" && <PayablesPanel data={directory.payables} />}
      {view === "relatorios" && <ReportsPanel directory={directory} />}
    </div>}
  </div>;
}
