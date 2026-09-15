"use client";

import { useMemo, useState } from "react";
import { growthPeople } from "./_lib/mock-data";
import {
  buildRadarMetrics,
  filterPeople,
  opportunityLevel,
  type GrowthPerson,
} from "./_lib/model";

type FilterKey = "all" | "high" | "never_contacted" | "inactive" | "abandoned" | "incomplete";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "high", label: "Alta oportunidade" },
  { key: "never_contacted", label: "Nunca contatados" },
  { key: "inactive", label: "Inativos 12+ meses" },
  { key: "abandoned", label: "Inscrição abandonada" },
  { key: "incomplete", label: "Cadastro incompleto" },
];

function scoreClass(score: number) {
  const level = opportunityLevel(score);
  if (level === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (level === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function stageLabel(stage: GrowthPerson["stage"]) {
  const labels: Record<GrowthPerson["stage"], string> = {
    identified: "Identificado",
    reachable: "Alcançável",
    contacted: "Contatado",
    engaged: "Engajado",
    interested: "Interessado",
    registered: "Inscrito",
    attended: "Participou",
    recurring: "Recorrente",
    inactive: "Inativo",
  };
  return labels[stage];
}

export default function GrowthDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const metrics = useMemo(() => buildRadarMetrics(growthPeople), []);
  const people = useMemo(
    () => filterPeople(growthPeople, activeFilter),
    [activeFilter],
  );

  const averageOpportunity = Math.round(
    growthPeople.reduce((total, person) => total + person.opportunityScore, 0) /
      growthPeople.length,
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-7">
      <section className="rounded-3xl overflow-hidden border border-blue-100 bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 text-white shadow-xl shadow-blue-950/10">
        <div className="p-7 lg:p-9 grid lg:grid-cols-[1.4fr_0.6fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-blue-100">
              Radar UVERGS · Protótipo seguro
            </div>
            <h1 className="mt-4 text-3xl lg:text-4xl font-bold tracking-tight">
              Transformar dados em relacionamento e participação
            </h1>
            <p className="mt-3 max-w-3xl text-blue-100 leading-relaxed">
              Uma visão operacional para identificar quem deve ser contatado, por quê e qual é a próxima melhor ação para aproximar vereadores e Câmaras da UVERGS.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/10 px-3 py-1.5">Base 360º</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Oportunidades</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Segmentação</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Próxima ação</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-widest text-blue-200">Índice médio de oportunidade</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-5xl font-bold">{averageOpportunity}</span>
              <span className="text-blue-200 pb-1">/ 100</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${averageOpportunity}%` }} />
            </div>
            <p className="mt-3 text-xs text-blue-200">
              Demonstração com dados sintéticos. Nenhum dado pessoal real é exibido nesta tela.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Oportunidades de hoje</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">Onde a equipe deve agir primeiro</h2>
          </div>
          <span className="text-xs text-slate-400">Dados de demonstração</span>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <article key={metric.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{metric.label}</p>
                  <p className="text-4xl font-bold text-slate-950 mt-2">{metric.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg font-bold">
                  ↗
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-3">{metric.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 lg:p-6 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Base 360º</p>
              <h2 className="text-xl font-semibold text-slate-900 mt-1">Vereadores e relacionamento</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                    activeFilter === filter.key
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Vereador</th>
                <th className="px-4 py-3 font-semibold">Relacionamento</th>
                <th className="px-4 py-3 font-semibold">Oportunidade</th>
                <th className="px-4 py-3 font-semibold">Canais</th>
                <th className="px-4 py-3 font-semibold">Próxima ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-blue-50/40 transition-colors align-top">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{person.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{person.municipality} · {person.region}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{person.chamber}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {stageLabel(person.stage)}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">Engajamento: {person.engagementScore}/100</p>
                    <p className="text-xs text-slate-500 mt-0.5">Qualidade: {person.dataQualityScore}/100</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 font-bold ${scoreClass(person.opportunityScore)}`}>
                      {person.opportunityScore}/100
                    </span>
                    {person.interests.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2 max-w-48">{person.interests.slice(0, 2).join(" · ")}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {person.validChannels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {person.validChannels.map((channel) => (
                          <span key={channel} className="rounded-md bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-semibold uppercase">
                            {channel}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-rose-600">Sem canal válido</span>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-sm">
                    <p className="font-semibold text-slate-800">{person.nextAction}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{person.nextActionReason}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{people.length} registro(s) neste segmento</span>
          <span>Score v1 · explicável · sem critério partidário</span>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <article className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Visão estratégica</p>
          <h3 className="text-lg font-semibold text-slate-900 mt-1">Da lista de contatos para um funil de relacionamento</h3>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              ["Identificados", growthPeople.length],
              ["Alcançáveis", growthPeople.filter((p) => p.validChannels.length > 0).length],
              ["Engajados", growthPeople.filter((p) => p.engagementScore >= 60).length],
              ["Alta oportunidade", growthPeople.filter((p) => p.opportunityScore >= 75).length],
            ].map(([label, value], index) => (
              <div key={String(label)} className="relative rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{label}</p>
                {index < 3 && <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-blue-400">→</span>}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-700">Gate de segurança</p>
          <h3 className="text-lg font-semibold text-amber-950 mt-1">Interface pronta, dados reais bloqueados</h3>
          <p className="text-sm text-amber-800 mt-3 leading-relaxed">
            Esta entrega não cria migration nem acessa PII real. A conexão com dados institucionais será feita somente após o Gate F0 completo.
          </p>
        </article>
      </section>
    </div>
  );
}
