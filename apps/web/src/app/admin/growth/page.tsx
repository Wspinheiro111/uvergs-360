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

const regionalCoverage = [
  { region: "Missões", relationship: 84, reachable: 91, events: 76 },
  { region: "Noroeste", relationship: 78, reachable: 86, events: 71 },
  { region: "Central", relationship: 72, reachable: 83, events: 64 },
  { region: "Metropolitana", relationship: 67, reachable: 79, events: 59 },
  { region: "Fronteira Oeste", relationship: 54, reachable: 68, events: 41 },
  { region: "Serra", relationship: 61, reachable: 75, events: 53 },
];

const chamberRanking = [
  { chamber: "Santo Ângelo", score: 94, note: "Relacionamento forte" },
  { chamber: "Ijuí", score: 91, note: "Alta recorrência" },
  { chamber: "Santa Maria", score: 87, note: "Engajamento crescente" },
  { chamber: "Cerro Largo", score: 81, note: "Boa oportunidade" },
  { chamber: "Cruz Alta", score: 74, note: "Potencial de ativação" },
];

const eventFunnel = [
  { label: "Alcançados", value: 1240, width: 100 },
  { label: "Engajados", value: 682, width: 76 },
  { label: "Interessados", value: 354, width: 55 },
  { label: "Inscritos", value: 188, width: 36 },
  { label: "Presentes", value: 162, width: 29 },
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

function heatClass(value: number) {
  if (value >= 80) return "bg-emerald-500 text-white";
  if (value >= 65) return "bg-blue-500 text-white";
  if (value >= 50) return "bg-amber-400 text-slate-950";
  return "bg-rose-400 text-white";
}

export default function GrowthDashboardPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const metrics = useMemo(() => buildRadarMetrics(growthPeople), []);
  const people = useMemo(() => filterPeople(growthPeople, activeFilter), [activeFilter]);

  const averageOpportunity = Math.round(
    growthPeople.reduce((total, person) => total + person.opportunityScore, 0) /
      growthPeople.length,
  );

  const highOpportunity = growthPeople.filter((p) => p.opportunityScore >= 75).length;
  const reachable = growthPeople.filter((p) => p.validChannels.length > 0).length;
  const engaged = growthPeople.filter((p) => p.engagementScore >= 60).length;
  const activationRate = Math.round((reachable / growthPeople.length) * 100);

  return (
    <div className="p-5 lg:p-8 max-w-[1700px] mx-auto space-y-7">
      <section className="relative rounded-[30px] overflow-hidden border border-blue-100 bg-gradient-to-br from-[#08244d] via-[#0d4da1] to-[#1188e8] text-white shadow-[0_30px_80px_-35px_rgba(7,54,120,.55)]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.35),transparent_24%),radial-gradient(circle_at_85%_80%,rgba(22,163,74,.25),transparent_28%)]" />
        <div className="relative p-7 lg:p-10 grid xl:grid-cols-[1.35fr_0.65fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] uppercase text-blue-100 backdrop-blur-sm">
              Radar UVERGS · Inteligência de Relacionamento
            </div>
            <h1 className="mt-5 text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.02] max-w-5xl">
              Ver o Rio Grande do Sul inteiro e saber onde agir primeiro.
            </h1>
            <p className="mt-5 max-w-3xl text-base lg:text-lg text-blue-100 leading-relaxed">
              Uma central executiva para transformar dados em aproximação, participação em eventos e vínculo permanente entre UVERGS, Câmaras e vereadores.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5 text-sm">
              {["Base 360º", "Radar de oportunidades", "Mapa institucional", "Próxima melhor ação", "Conversão por evento"].map((item) => (
                <span key={item} className="rounded-full bg-white/10 border border-white/10 px-3.5 py-1.5 backdrop-blur-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Oportunidade média", `${averageOpportunity}/100`, "priorização explicável"],
              ["Base alcançável", `${activationRate}%`, "com canal válido"],
              ["Alta oportunidade", String(highOpportunity), "para ação imediata"],
              ["Engajados", String(engaged), "com sinais recentes"],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl bg-white/10 border border-white/15 p-4 lg:p-5 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.14em] text-blue-200">{label}</p>
                <p className="mt-2 text-3xl lg:text-4xl font-bold">{value}</p>
                <p className="mt-2 text-xs text-blue-200">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <article key={metric.key} className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${index === 0 ? "bg-blue-700 border-blue-700 text-white" : "bg-white border-slate-200"}`}>
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full bg-blue-400/10" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <p className={`text-sm font-semibold ${index === 0 ? "text-blue-50" : "text-slate-700"}`}>{metric.label}</p>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`}>↗</span>
              </div>
              <p className={`text-4xl font-bold mt-3 ${index === 0 ? "text-white" : "text-slate-950"}`}>{metric.value}</p>
              <p className={`text-xs leading-relaxed mt-3 ${index === 0 ? "text-blue-100" : "text-slate-500"}`}>{metric.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5">
        <article className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-blue-700">Mapa de presença institucional</p>
              <h2 className="text-2xl font-semibold text-slate-950 mt-1">Força de relacionamento por região</h2>
              <p className="text-sm text-slate-500 mt-2">Leitura executiva de cobertura, alcance e participação.</p>
            </div>
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold">Visão RS</span>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-5 items-stretch">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 min-h-[330px] flex items-center justify-center">
              <div className="relative w-full max-w-[320px] aspect-[0.78]">
                <div className="absolute inset-[8%_8%_6%_8%] bg-gradient-to-br from-blue-700 via-blue-500 to-emerald-500 [clip-path:polygon(42%_0%,61%_6%,73%_17%,92%_32%,88%_47%,100%_63%,83%_80%,64%_91%,55%_100%,37%_93%,25%_80%,11%_69%,4%_50%,11%_34%,22%_21%)] shadow-2xl shadow-blue-200" />
                <div className="absolute left-[32%] top-[28%] w-3.5 h-3.5 rounded-full bg-white ring-4 ring-white/30 shadow" title="Missões" />
                <div className="absolute left-[48%] top-[35%] w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shadow" title="Noroeste" />
                <div className="absolute left-[50%] top-[54%] w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shadow" title="Central" />
                <div className="absolute left-[70%] top-[67%] w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shadow" title="Metropolitana" />
                <div className="absolute left-[22%] top-[61%] w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shadow" title="Fronteira Oeste" />
                <div className="absolute right-[18%] top-[32%] w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shadow" title="Serra" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="rounded-2xl bg-white/90 border border-white px-4 py-3 text-center shadow-lg backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Cobertura RS</p>
                    <p className="text-3xl font-bold text-blue-800 mt-1">497</p>
                    <p className="text-xs text-slate-500">municípios no radar</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {regionalCoverage.map((region) => (
                <div key={region.region} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{region.region}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Relacionamento {region.relationship}% · Alcance {region.reachable}%</p>
                    </div>
                    <span className={`min-w-12 text-center rounded-xl px-2.5 py-1.5 text-xs font-bold ${heatClass(region.relationship)}`}>{region.relationship}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${region.relationship}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-950 text-white shadow-sm">
          <div className="p-6 lg:p-7 border-b border-white/10">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-blue-300">Próximo grande evento</p>
            <h2 className="text-2xl font-semibold mt-1">Funil de conversão</h2>
            <p className="text-sm text-slate-400 mt-2">Da comunicação à presença confirmada.</p>
          </div>
          <div className="p-6 lg:p-7 space-y-4">
            {eventFunnel.map((step, index) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-300">{step.label}</span>
                  <span className="font-bold text-white">{step.value.toLocaleString("pt-BR")}</span>
                </div>
                <div className="h-8 rounded-xl bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-xl flex items-center px-3 text-xs font-semibold ${index === eventFunnel.length - 1 ? "bg-emerald-500 text-emerald-950" : "bg-gradient-to-r from-blue-600 to-cyan-400 text-white"}`}
                    style={{ width: `${step.width}%` }}
                  >
                    {index > 0 && `${Math.round((step.value / eventFunnel[index - 1].value) * 100)}%`}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Conversão total</p>
                <p className="text-3xl font-bold mt-1">13,1%</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-[11px] uppercase tracking-widest text-slate-400">Presença / inscritos</p>
                <p className="text-3xl font-bold mt-1">86,2%</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
        <article className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-blue-700">Câmaras em destaque</p>
              <h2 className="text-xl font-semibold text-slate-950 mt-1">Relacionamento institucional</h2>
            </div>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>
          <div className="mt-5 space-y-3">
            {chamberRanking.map((item, index) => (
              <div key={item.chamber} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900 truncate">{item.chamber}</p>
                    <span className="text-sm font-bold text-slate-900">{item.score}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{item.note}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-blue-50 border border-amber-100 p-6 lg:p-7 shadow-sm">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-amber-700">Diretoria em 10 segundos</p>
          <h2 className="text-2xl font-semibold text-slate-950 mt-1">O que o sistema diria hoje para a UVERGS</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-3">
            {[
              ["🔥", "Prioridade imediata", "4 vereadores apresentam alta oportunidade e deveriam receber abordagem personalizada."],
              ["🎯", "Maior potencial", "Missões e Noroeste concentram os melhores índices de relacionamento no cenário demonstrativo."],
              ["⚠️", "Ponto de atenção", "Fronteira Oeste tem espaço claro para recuperação de relacionamento e presença em eventos."],
              ["💡", "Ação recomendada", "Criar uma jornada de reativação para inativos e uma campanha específica para inscrições abandonadas."],
            ].map(([icon, title, text]) => (
              <div key={title} className="rounded-2xl bg-white/80 border border-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 lg:p-6 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-blue-700">Base 360º</p>
              <h2 className="text-2xl font-semibold text-slate-950 mt-1">Vereadores e relacionamento</h2>
              <p className="text-sm text-slate-500 mt-1">Da identificação até a próxima melhor ação.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${activeFilter === filter.key ? "bg-blue-700 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
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
                <tr key={person.id} className="hover:bg-blue-50/50 transition-colors align-top">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-emerald-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                        {person.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{person.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{person.municipality} · {person.region}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{person.chamber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{stageLabel(person.stage)}</span>
                    <p className="text-xs text-slate-500 mt-2">Engajamento: {person.engagementScore}/100</p>
                    <p className="text-xs text-slate-500 mt-0.5">Qualidade: {person.dataQualityScore}/100</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 font-bold ${scoreClass(person.opportunityScore)}`}>{person.opportunityScore}/100</span>
                    {person.interests.length > 0 && <p className="text-xs text-slate-500 mt-2 max-w-52">{person.interests.slice(0, 2).join(" · ")}</p>}
                  </td>
                  <td className="px-4 py-4">
                    {person.validChannels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {person.validChannels.map((channel) => (
                          <span key={channel} className="rounded-md bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-semibold uppercase">{channel}</span>
                        ))}
                      </div>
                    ) : <span className="text-xs font-semibold text-rose-600">Sem canal válido</span>}
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

      <section className="grid lg:grid-cols-[1.4fr_0.6fr] gap-5">
        <article className="bg-white border border-slate-200 rounded-3xl p-6">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-blue-700">Visão estratégica</p>
          <h3 className="text-xl font-semibold text-slate-950 mt-1">Da lista de contatos para um motor de relacionamento</h3>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[
              ["Identificados", growthPeople.length],
              ["Alcançáveis", reachable],
              ["Engajados", engaged],
              ["Alta oportunidade", highOpportunity],
            ].map(([label, value], index) => (
              <div key={String(label)} className="relative rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-4 text-center">
                <p className="text-3xl font-bold text-slate-950">{value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{label}</p>
                {index < 3 && <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-blue-400">→</span>}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-amber-700">Gate de segurança</p>
          <h3 className="text-lg font-semibold text-amber-950 mt-1">Visual premium, dados reais ainda bloqueados</h3>
          <p className="text-sm text-amber-800 mt-3 leading-relaxed">
            Esta versão usa apenas dados sintéticos. Nenhuma migration, PII real ou operação sensível foi habilitada antes do Gate F0 completo.
          </p>
        </article>
      </section>
    </div>
  );
}
