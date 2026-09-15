import { loadBase360Directory, type MandateOffice } from "@/lib/relationship-data";

import { DataNotice } from "../../_components/DataNotice";

// =============================================================================
// Base 360º — docs/UVERGS_360_PRODUCT_SCOPE_V2.md, seção 2.1
//
// Primeira peça real do módulo Relacionamento. Mostra pessoa/vereador,
// Câmara, município, mandato/vínculo, qualidade cadastral e contato
// mascarado — tudo lido de mandates/persons/chambers/municipalities
// (packages/db/migrations 0008 e 0015).
//
// Os campos de CRM previstos no escopo (score de engajamento, score de
// oportunidade, próxima melhor ação, última interação) NÃO existem no
// banco ainda. Aparecem aqui como "Ainda não calculado" — nunca como
// número inventado. Ver relationship-data.ts para o porquê.
// =============================================================================

const OFFICE_FILTERS: Array<[MandateOffice | "all", string]> = [
  ["all", "Todos"],
  ["councilor", "Vereadores"],
  ["president", "Presidentes"],
  ["vice_president", "Vice-presidentes"],
  ["substitute", "Suplentes"],
];

const OFFICE_LABELS: Record<MandateOffice, string> = {
  councilor: "Vereador(a)",
  president: "Presidente",
  vice_president: "Vice-presidente",
  substitute: "Suplente",
};

const MANDATE_STATUS_LABELS: Record<string, string> = {
  active: "Mandato ativo",
  licensed: "Em licença",
  completed: "Mandato encerrado",
  revoked: "Cassado",
};

const DATA_QUALITY_LABELS: Record<string, { label: string; className: string }> = {
  verified: { label: "Cadastro verificado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "Cadastro parcial", className: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Cadastro pendente", className: "bg-slate-100 text-slate-500 border-slate-200" },
  divergent: { label: "Dado divergente", className: "bg-red-50 text-red-700 border-red-200" },
};

function formatMandateDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

interface Base360PageProps {
  searchParams: Promise<{ q?: string; cargo?: string }>;
}

export default async function Base360Page({ searchParams }: Base360PageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const officeFilter = OFFICE_FILTERS.some(([key]) => key === params.cargo)
    ? (params.cargo as MandateOffice | "all")
    : "all";

  const result = await loadBase360Directory(search, officeFilter);
  const directory = result.data;

  return (
    <div className="page-canvas">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b2b63] via-[#123f86] to-[#0c326f] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(4,40,104,.8)] sm:px-9">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="eyebrow-light">Relacionamento · Núcleo do produto</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Base 360º de vereadores e Câmaras</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
            Cadastro real, vindo do banco — mandatos, suplência e qualidade de contato.
            Scores de engajamento e próxima melhor ação ainda não foram calculados;
            aparecerão aqui assim que essa fundação for construída.
          </p>
        </div>
      </section>

      {result.error && (
        <div className="mt-6">
          <DataNotice message={result.error} />
        </div>
      )}

      {directory && (
        <>
          <section className="metric-grid mt-6">
            <article className="metric-card metric-blue">
              <p className="text-xs uppercase tracking-wider text-slate-500">Pessoas cadastradas</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{directory.totals.totalPeople}</p>
            </article>
            <article className="metric-card metric-green">
              <p className="text-xs uppercase tracking-wider text-slate-500">Mandatos ativos</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{directory.totals.activeMandates}</p>
            </article>
            <article className="metric-card metric-gold">
              <p className="text-xs uppercase tracking-wider text-slate-500">Suplentes</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{directory.totals.substitutes}</p>
            </article>
            <article className="metric-card metric-violet">
              <p className="text-xs uppercase tracking-wider text-slate-500">Câmaras representadas</p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{directory.totals.chambersRepresented}</p>
            </article>
          </section>

          <form className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4" method="get">
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome, Câmara ou município..."
              className="form-input min-w-[240px] flex-1"
            />
            <select name="cargo" defaultValue={officeFilter} className="form-input w-auto">
              {OFFICE_FILTERS.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-[#0b3567] px-5 py-2.5 text-sm font-semibold text-white">
              Filtrar
            </button>
          </form>

          <section className="surface-panel mt-6 overflow-hidden">
            {directory.rows.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Nenhum registro encontrado para os filtros atuais.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {directory.rows.map((row) => (
                  <Base360RowCard key={`${row.personId}-${row.chamberId}-${row.office}`} row={row} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Base360RowCard({ row }: { row: import("@/lib/relationship-data").Base360Row }) {
  const quality = DATA_QUALITY_LABELS[row.chamberDataQuality];
  return (
    <article className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold text-slate-900">
            {row.electoralName ?? row.fullName}
          </p>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {OFFICE_LABELS[row.office]}
            {row.substituteRank ? ` · ${row.substituteRank}º` : ""}
          </span>
          <Base360StatusBadges currentExercise={row.currentExercise} personStatus={row.personStatus} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {row.chamberName} · {row.municipalityName}
          {row.legislatureLabel && ` · ${row.legislatureLabel}`}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {MANDATE_STATUS_LABELS[row.mandateStatus] ?? row.mandateStatus} desde {formatMandateDate(row.startedAt)}
          {row.endedAt && ` até ${formatMandateDate(row.endedAt)}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>E-mail: {row.emailMasked ?? "não cadastrado"}</span>
          <span>Telefone: {row.phoneMasked ?? "não cadastrado"}</span>
          {row.whatsappMasked && <span>WhatsApp: {row.whatsappMasked}</span>}
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 lg:items-end">
        {quality && (
          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${quality.className}`}>
            {quality.label}
          </span>
        )}
        <PendingCrmMetrics />
        <p className="text-[11px] text-slate-400">Última interação: ainda não calculado</p>
      </div>
    </article>
  );
}

function Base360StatusBadges({ currentExercise, personStatus }: { currentExercise: boolean; personStatus: "active" | "inactive" | "deceased" }) {
  return (
    <>
      {!currentExercise && (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          Fora de exercício
        </span>
      )}
      {personStatus !== "active" && (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
          Pessoa {personStatus === "deceased" ? "falecida" : "inativa"}
        </span>
      )}
    </>
  );
}

/** Placeholder honesto: estes dois scores fazem parte do escopo v2, mas
 * nenhum dado de CRM existe no banco ainda (ver relationship-data.ts).
 * Nunca deve virar um número — só este aviso, até a fundação existir. */
function PendingCrmMetrics() {
  return (
    <div className="grid grid-cols-2 gap-2 text-center">
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Engajamento</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400">Ainda não calculado</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">Oportunidade</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400">Ainda não calculado</p>
      </div>
    </div>
  );
}
