import { loadEventDirectory, type EventStatus } from "@/lib/event-data";

import { DataNotice } from "../_components/DataNotice";

const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  registration_open: "Inscrições abertas",
  full: "Lotado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_STYLES: Record<EventStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-600",
  published: "border-blue-200 bg-blue-50 text-blue-700",
  registration_open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  full: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-cyan-200 bg-cyan-50 text-cyan-700",
  completed: "border-violet-200 bg-violet-50 text-violet-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
};

const FORMAT_LABELS = { in_person: "Presencial", online: "Online", hybrid: "Híbrido" } as const;
const VALID_STATUSES = new Set<EventStatus>(Object.keys(STATUS_LABELS) as EventStatus[]);

interface EventsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

function normalizeStatus(value?: string): EventStatus | "all" {
  return value && VALID_STATUSES.has(value as EventStatus) ? value as EventStatus : "all";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(value);
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const status = normalizeStatus(params.status);
  const result = await loadEventDirectory(search, status);
  const directory = result.data;

  const metrics = directory ? [
    { label: "Próximos", value: directory.totals.upcoming, detail: "eventos na agenda", tone: "blue" },
    { label: "Inscrições", value: directory.totals.openRegistrations, detail: "eventos recebendo público", tone: "green" },
    { label: "Participantes", value: directory.totals.confirmedParticipants, detail: "confirmados", tone: "gold" },
    { label: "Certificados", value: directory.totals.certificatesIssued, detail: "documentos emitidos", tone: "violet" },
  ] as const : [];

  return (
    <div className="page-canvas">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#06336a] via-[#0759a7] to-[#00a6c7] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(8,78,144,.8)] sm:px-9">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[48px] border-white/10" />
        <div className="absolute bottom-[-70px] left-[42%] h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end">
          <div className="max-w-3xl">
            <span className="eyebrow-light">Experiências UVERGS</span>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Eventos que conectam, capacitam e deixam legado.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50 sm:text-base">Agenda, inscrições, credenciamento, presença e certificados reunidos em uma jornada simples.</p>
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">Fluxo conectado</p>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold"><span>Agenda</span><span className="text-cyan-200">→</span><span>Inscrição</span><span className="text-cyan-200">→</span><span>Certificado</span></div>
          </div>
        </div>
      </section>

      {result.error && <div className="mt-6"><DataNotice message={result.error} /></div>}

      {directory && (
        <>
          <section className="metric-grid mt-6" aria-label="Indicadores de eventos">
            {metrics.map((metric) => (
              <article key={metric.label} className={`metric-card metric-${metric.tone}`}>
                <span className="metric-orb" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="surface-panel mt-6">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div><span className="eyebrow">Programação integrada</span><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">Agenda de eventos</h2></div>
              <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700">Inscrição ao certificado</span>
            </div>

            <form className="grid gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-[1fr_230px_auto] sm:p-5">
              <label><span className="sr-only">Buscar evento</span><input name="q" type="search" defaultValue={search} placeholder="Buscar evento, cidade ou local" className="modern-input" /></label>
              <label><span className="sr-only">Filtrar situação</span><select name="status" defaultValue={status} className="modern-input"><option value="all">Todas as situações</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <button className="primary-button">Filtrar agenda</button>
            </form>

            <div className="grid gap-4 p-5 lg:grid-cols-2 lg:p-6">
              {directory.events.map((event) => {
                const occupancy = event.capacity ? Math.min(100, Math.round((event.confirmed / event.capacity) * 100)) : null;
                return (
                  <article key={event.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/[0.06]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-center text-blue-800"><span className="text-lg font-black leading-none">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "America/Sao_Paulo" }).format(event.startsAt)}</span><span className="text-[9px] font-bold uppercase">{new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "America/Sao_Paulo" }).format(event.startsAt)}</span></div>
                      <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${STATUS_STYLES[event.status]}`}>{STATUS_LABELS[event.status]}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-slate-950">{event.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">{formatDate(event.startsAt)} · {formatTime(event.startsAt)}–{formatTime(event.endsAt)}</p>
                    <p className="mt-1 text-sm text-slate-500">{event.municipalityName ?? "Online"}{event.venueName ? ` · ${event.venueName}` : ""}</p>
                    <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                      <div><p className="text-base font-bold text-slate-900">{event.registrations}</p><p className="text-[10px] text-slate-500">inscritos</p></div>
                      <div><p className="text-base font-bold text-slate-900">{event.attended}</p><p className="text-[10px] text-slate-500">presentes</p></div>
                      <div><p className="text-base font-bold text-slate-900">{Math.round(event.workloadMinutes / 60)}h</p><p className="text-[10px] text-slate-500">carga horária</p></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{FORMAT_LABELS[event.format]}</span><span>{event.capacity ? `${event.confirmed}/${event.capacity} vagas` : "Sem limite"}</span></div>
                    {occupancy !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400" style={{ width: `${occupancy}%` }} /></div>}
                  </article>
                );
              })}
            </div>

            {directory.events.length === 0 && <div className="px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-2xl text-cyan-700">◇</div><h3 className="mt-4 font-semibold text-slate-900">Agenda pronta para novos encontros</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Nenhum evento atende aos filtros atuais. A estrutura completa de inscrições, presença e certificados já está preparada.</p></div>}
          </section>
        </>
      )}
    </div>
  );
}
