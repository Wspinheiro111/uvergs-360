import { loadInstitutionalDirectory, type AffiliationStatus } from "@/lib/admin-data";

import { DataNotice } from "../_components/DataNotice";

const AFFILIATION_LABELS: Record<AffiliationStatus, string> = {
  affiliated: "Associada",
  prospect: "Em relacionamento",
  inactive: "Inativa",
};

const AFFILIATION_STYLES: Record<AffiliationStatus, string> = {
  affiliated: "border-emerald-200 bg-emerald-50 text-emerald-700",
  prospect: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-600",
};

const VALID_AFFILIATIONS = new Set<AffiliationStatus>(["affiliated", "prospect", "inactive"]);

interface InstitutionalPageProps {
  searchParams: Promise<{ q?: string; affiliation?: string; region?: string }>;
}

function normalizeAffiliation(value?: string): AffiliationStatus | "all" {
  return value && VALID_AFFILIATIONS.has(value as AffiliationStatus)
    ? value as AffiliationStatus
    : "all";
}

export default async function InstitutionalPage({ searchParams }: InstitutionalPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const affiliation = normalizeAffiliation(params.affiliation);
  const region = params.region?.trim().slice(0, 100) ?? "";
  const result = await loadInstitutionalDirectory(search, affiliation, region);
  const directory = result.data;

  const metrics = directory ? [
    { label: "Câmaras", value: directory.totals.chambers, detail: "na rede institucional", tone: "blue" },
    { label: "Associadas", value: directory.totals.affiliated, detail: "vínculos ativos", tone: "green" },
    { label: "Municípios", value: directory.totals.municipalities, detail: "com cobertura", tone: "gold" },
    { label: "Mandatos", value: directory.totals.activeMandates, detail: "ativos ou licenciados", tone: "violet" },
  ] as const : [];

  return (
    <div className="page-canvas">
      <section className="relative overflow-hidden rounded-[28px] bg-[#092c5c] px-6 py-8 text-white shadow-[0_24px_70px_-36px_rgba(8,44,92,.8)] sm:px-9">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-20 h-32 w-52 rotate-[-12deg] rounded-full bg-amber-300/15 blur-2xl" />
        <div className="relative max-w-3xl">
          <span className="eyebrow-light">Rede UVERGS</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Inteligência institucional em uma única visão.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Acompanhe municípios, Câmaras e mandatos com dados conectados, cobertura regional e situação de associação.
          </p>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2 text-xs text-blue-100">
          <span className="hero-chip"><span className="status-dot bg-emerald-400" /> Dados isolados</span>
          <span className="hero-chip">Atualização em tempo real</span>
          <span className="hero-chip">Base preparada para 497 municípios</span>
        </div>
      </section>

      {result.error && <div className="mt-6"><DataNotice message={result.error} /></div>}

      {directory && (
        <>
          <section className="metric-grid mt-6" aria-label="Indicadores institucionais">
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
              <div>
                <span className="eyebrow">Diretório vivo</span>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">Câmaras e municípios</h2>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">Consulta segura</span>
            </div>

            <form className="grid gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 sm:grid-cols-[1fr_210px_210px_auto] sm:p-5">
              <label>
                <span className="sr-only">Buscar Câmara ou município</span>
                <input name="q" type="search" defaultValue={search} placeholder="Buscar Câmara ou município" className="modern-input" />
              </label>
              <label>
                <span className="sr-only">Filtrar vínculo</span>
                <select name="affiliation" defaultValue={affiliation} className="modern-input">
                  <option value="all">Todos os vínculos</option>
                  {Object.entries(AFFILIATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Filtrar região</span>
                <select name="region" defaultValue={region} className="modern-input">
                  <option value="">Todas as regiões</option>
                  {directory.regions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button className="primary-button">Explorar</button>
            </form>

            <div className="divide-y divide-slate-100">
              {directory.chambers.map((chamber) => (
                <article key={chamber.id} className="group grid gap-4 px-5 py-5 transition-colors hover:bg-blue-50/35 lg:grid-cols-[1.5fr_.8fr_.65fr_auto] lg:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-blue-900/10">
                      {chamber.municipality.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{chamber.shortName ?? chamber.legalName}</h3>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{chamber.municipality} · {chamber.stateCode}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Região</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{chamber.mesoregion ?? "Não informada"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Mandatos</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{chamber.councilors} acompanhados</p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${AFFILIATION_STYLES[chamber.affiliationStatus]}`}>
                    {AFFILIATION_LABELS[chamber.affiliationStatus]}
                  </span>
                </article>
              ))}
            </div>

            {directory.chambers.length === 0 && (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl">◎</div>
                <h3 className="mt-4 font-semibold text-slate-900">A rede está pronta para receber os dados</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Nenhuma Câmara atende aos filtros atuais. A estrutura institucional e o isolamento já estão ativos.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
