import { loadFinancialDirectory, type ReceivableStatus } from "@/lib/financial-data";

import { DataNotice } from "../_components/DataNotice";

const STATUS_LABELS: Record<ReceivableStatus, string> = {
  open: "Em aberto", overdue: "Vencida", partial: "Parcial", paid: "Quitada", cancelled: "Cancelada", waived: "Isenta",
};
const STATUS_STYLES: Record<ReceivableStatus, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700",
  overdue: "border-red-200 bg-red-50 text-red-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  waived: "border-violet-200 bg-violet-50 text-violet-700",
};
const VALID_STATUSES = new Set<ReceivableStatus>(Object.keys(STATUS_LABELS) as ReceivableStatus[]);

interface FinancialPageProps { searchParams: Promise<{ q?: string; status?: string }>; }

function normalizeStatus(value?: string): ReceivableStatus | "all" {
  return value && VALID_STATUSES.has(value as ReceivableStatus) ? value as ReceivableStatus : "all";
}
function currency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
function shortDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

export default async function FinancialPage({ searchParams }: FinancialPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const status = normalizeStatus(params.status);
  const result = await loadFinancialDirectory(search, status);
  const directory = result.data;
  const metrics = directory ? [
    { label: "Receita prevista", value: currency(directory.totals.expectedCents), detail: "títulos válidos", tone: "blue" },
    { label: "Recebido", value: currency(directory.totals.receivedCents), detail: "pagamentos confirmados", tone: "green" },
    { label: "Em atraso", value: currency(directory.totals.overdueCents), detail: "atenção necessária", tone: "gold" },
    { label: "Compromissos", value: currency(directory.totals.commitmentsCents), detail: "planejados e aprovados", tone: "violet" },
  ] as const : [];

  return <div className="page-canvas">
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#083d74] via-[#087a92] to-[#12a77d] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(4,90,104,.8)] sm:px-9">
      <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative max-w-3xl"><span className="eyebrow-light">Saúde associativa</span><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Finanças claras fortalecem toda a rede.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">Acompanhe anuidades, eventos, recebimentos e compromissos com rastreabilidade e visão executiva.</p></div>
      <div className="relative mt-7 flex flex-wrap gap-2 text-xs text-emerald-50"><span className="hero-chip"><span className="status-dot bg-emerald-300" /> Valores em centavos</span><span className="hero-chip">Pagamentos idempotentes</span><span className="hero-chip">Isolamento por organização</span></div>
    </section>
    {result.error && <div className="mt-6"><DataNotice message={result.error} /></div>}
    {directory && <>
      <section className="metric-grid mt-6" aria-label="Indicadores financeiros">{metrics.map(metric => <article key={metric.label} className={`metric-card metric-${metric.tone}`}><span className="metric-orb" /><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></article>)}</section>
      <section className="surface-panel mt-6">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><span className="eyebrow">Controle associativo</span><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">Contas a receber</h2></div><span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Conciliação preparada</span></div>
        <form className="grid gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-[1fr_220px_auto] sm:p-5"><label><span className="sr-only">Buscar cobrança</span><input name="q" type="search" defaultValue={search} placeholder="Buscar Câmara ou cobrança" className="modern-input" /></label><label><span className="sr-only">Filtrar situação</span><select name="status" defaultValue={status} className="modern-input"><option value="all">Todas as situações</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="primary-button">Atualizar visão</button></form>
        <div className="divide-y divide-slate-100">{directory.receivables.map(item => {
          const progress = Math.min(100, Math.round((item.paidCents / item.amountCents) * 100));
          return <article key={item.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-emerald-50/30 lg:grid-cols-[1.4fr_.75fr_.75fr_auto] lg:items-center"><div><h3 className="font-semibold text-slate-900">{item.debtorName}</h3><p className="mt-1 text-sm text-slate-500">{item.description}{item.competence ? ` · ${item.competence}` : ""}</p><div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-emerald-400" style={{ width: `${progress}%` }} /></div></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Vencimento</p><p className="mt-1 text-sm font-medium text-slate-700">{shortDate(item.dueDate)}</p></div><div><p className="text-xs uppercase tracking-wide text-slate-400">Valor</p><p className="mt-1 text-sm font-semibold text-slate-900">{currency(item.amountCents)}</p><p className="text-[11px] text-slate-400">{currency(item.paidCents)} recebido</p></div><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}>{STATUS_LABELS[item.status]}</span></article>;
        })}</div>
        {directory.receivables.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">$</div><h3 className="mt-4 font-semibold text-slate-900">Nenhuma cobrança encontrada</h3><p className="mt-2 text-sm text-slate-500">A estrutura financeira está ativa e pronta para receber os lançamentos.</p></div>}
      </section>
    </>}
  </div>;
}
