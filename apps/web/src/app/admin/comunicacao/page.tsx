import { loadCommunicationDirectory, type CampaignStatus } from "@/lib/communication-data";

import { DataNotice } from "../_components/DataNotice";

const STATUS_LABELS: Record<CampaignStatus, string> = { draft: "Rascunho", scheduled: "Agendada", sending: "Enviando", completed: "Concluída", paused: "Pausada", cancelled: "Cancelada" };
const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-600", scheduled: "border-blue-200 bg-blue-50 text-blue-700", sending: "border-cyan-200 bg-cyan-50 text-cyan-700", completed: "border-emerald-200 bg-emerald-50 text-emerald-700", paused: "border-amber-200 bg-amber-50 text-amber-700", cancelled: "border-red-200 bg-red-50 text-red-700",
};
const CHANNEL_LABELS = { email: "E-mail", whatsapp: "WhatsApp", sms: "SMS", push: "Push" } as const;
const VALID_STATUSES = new Set<CampaignStatus>(Object.keys(STATUS_LABELS) as CampaignStatus[]);

interface CommunicationPageProps { searchParams: Promise<{ q?: string; status?: string }>; }
function normalizeStatus(value?: string): CampaignStatus | "all" { return value && VALID_STATUSES.has(value as CampaignStatus) ? value as CampaignStatus : "all"; }
function dateTime(value: Date | null) { return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(value) : "Sem agendamento"; }

export default async function CommunicationPage({ searchParams }: CommunicationPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const status = normalizeStatus(params.status);
  const result = await loadCommunicationDirectory(search, status);
  const directory = result.data;
  const metrics = directory ? [
    { label: "Campanhas", value: directory.totals.campaigns, detail: "ações registradas", tone: "blue" },
    { label: "Alcance", value: directory.totals.audience, detail: "destinatários", tone: "green" },
    { label: "Entregues", value: directory.totals.delivered, detail: "mensagens confirmadas", tone: "gold" },
    { label: "Engajamento", value: `${directory.totals.engagementRate}%`, detail: "leituras sobre alcance", tone: "violet" },
  ] as const : [];
  return <div className="page-canvas">
    <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1d2a76] via-[#5132a4] to-[#d43f8d] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(81,50,164,.8)] sm:px-9">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-pink-300/20 blur-3xl" /><div className="absolute bottom-[-80px] left-[35%] h-44 w-44 rounded-full bg-cyan-300/20 blur-2xl" />
      <div className="relative max-w-3xl"><span className="eyebrow-light">Relacionamento multicanal</span><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Uma voz próxima, relevante e mensurável.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-purple-50 sm:text-base">Campanhas segmentadas para Câmaras, vereadores e participantes, com consentimento, entrega e engajamento rastreáveis.</p></div>
      <div className="relative mt-7 flex flex-wrap gap-2 text-xs text-purple-50"><span className="hero-chip">E-mail</span><span className="hero-chip">WhatsApp</span><span className="hero-chip">SMS</span><span className="hero-chip">Push</span></div>
    </section>
    {result.error && <div className="mt-6"><DataNotice message={result.error} /></div>}
    {directory && <><section className="metric-grid mt-6" aria-label="Indicadores de comunicação">{metrics.map(metric => <article key={metric.label} className={`metric-card metric-${metric.tone}`}><span className="metric-orb" /><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.detail}</p></article>)}</section>
      <section className="surface-panel mt-6"><div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><span className="eyebrow">Central de campanhas</span><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">Comunicação institucional</h2></div><span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">LGPD por canal</span></div>
        <form className="grid gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-[1fr_220px_auto] sm:p-5"><label><span className="sr-only">Buscar campanha</span><input name="q" type="search" defaultValue={search} placeholder="Buscar campanha" className="modern-input" /></label><label><span className="sr-only">Filtrar situação</span><select name="status" defaultValue={status} className="modern-input"><option value="all">Todas as situações</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="primary-button">Filtrar campanhas</button></form>
        <div className="grid gap-4 p-5 lg:grid-cols-2 lg:p-6">{directory.campaigns.map(campaign => {
          const delivery = campaign.recipients ? Math.round((campaign.delivered / campaign.recipients) * 100) : 0;
          return <article key={campaign.id} className="rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-950/[0.06]"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-purple-50 text-sm font-black text-purple-700">{CHANNEL_LABELS[campaign.channel].slice(0, 2).toUpperCase()}</div><span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${STATUS_STYLES[campaign.status]}`}>{STATUS_LABELS[campaign.status]}</span></div><h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{campaign.name}</h3><p className="mt-1 text-sm text-slate-500">{CHANNEL_LABELS[campaign.channel]} · {dateTime(campaign.scheduledAt)}</p><div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center"><div><p className="font-bold text-slate-900">{campaign.recipients}</p><p className="text-[10px] text-slate-500">alcance</p></div><div><p className="font-bold text-slate-900">{campaign.delivered}</p><p className="text-[10px] text-slate-500">entregues</p></div><div><p className="font-bold text-slate-900">{campaign.read}</p><p className="text-[10px] text-slate-500">leituras</p></div></div><div className="mt-4 flex justify-between text-xs text-slate-500"><span>Entrega</span><span>{delivery}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-purple-700 to-pink-400" style={{ width: `${delivery}%` }} /></div></article>;
        })}</div>
        {directory.campaigns.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-2xl text-purple-700">✦</div><h3 className="mt-4 font-semibold text-slate-900">Central pronta para comunicar</h3><p className="mt-2 text-sm text-slate-500">Nenhuma campanha atende aos filtros atuais.</p></div>}
      </section></>}
  </div>;
}
