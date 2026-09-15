const regions = [
  { name: "Missões", strength: 88, reached: 76, active: 64, priority: "Expandir participação recorrente", x: 48, y: 42 },
  { name: "Noroeste", strength: 82, reached: 73, active: 61, priority: "Converter alto engajamento em inscrições", x: 39, y: 28 },
  { name: "Alto Jacuí", strength: 71, reached: 62, active: 47, priority: "Aumentar ativação de portal", x: 47, y: 31 },
  { name: "Central", strength: 77, reached: 68, active: 56, priority: "Ampliar recorrência em eventos", x: 53, y: 55 },
  { name: "Metropolitana", strength: 84, reached: 81, active: 70, priority: "Trabalhar campanhas por afinidade", x: 69, y: 70 },
  { name: "Serra", strength: 74, reached: 66, active: 51, priority: "Recuperar contatos inativos", x: 65, y: 43 },
  { name: "Fronteira Oeste", strength: 52, reached: 41, active: 29, priority: "Prospectar e completar contatos", x: 28, y: 57 },
  { name: "Sul", strength: 58, reached: 49, active: 34, priority: "Abrir relacionamento institucional", x: 58, y: 84 },
];

const municipalities = [
  ["Santo Ângelo", "Missões", 93, "forte"],
  ["Ijuí", "Noroeste", 91, "forte"],
  ["Santa Maria", "Central", 87, "forte"],
  ["Cruz Alta", "Alto Jacuí", 79, "médio"],
  ["Santa Rosa", "Noroeste", 72, "médio"],
  ["Cerro Largo", "Missões", 68, "médio"],
  ["Uruguaiana", "Fronteira Oeste", 44, "baixo"],
  ["São Borja", "Fronteira Oeste", 39, "baixo"],
];

function strengthClass(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 65) return "bg-blue-500";
  if (value >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function TerritoryPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-7">
      <section className="rounded-[32px] border border-blue-100 bg-white overflow-hidden shadow-sm">
        <div className="p-7 lg:p-9 bg-gradient-to-r from-sky-50 via-white to-emerald-50 grid lg:grid-cols-[1.25fr_0.75fr] gap-8 items-center">
          <div>
            <span className="inline-flex rounded-full bg-blue-700 text-white px-3 py-1 text-xs font-bold tracking-widest uppercase">Inteligência Territorial</span>
            <h1 className="mt-4 text-3xl lg:text-4xl font-bold text-slate-950 tracking-tight">Onde a UVERGS já é forte — e onde precisa crescer</h1>
            <p className="mt-3 text-slate-600 max-w-3xl leading-relaxed">Uma leitura territorial para identificar municípios, regiões e Câmaras com maior potencial de relacionamento, participação e expansão.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["497","Municípios RS"],["8","Regiões monitoradas"],["4","Faixas de relacionamento"]].map(([value,label]) => (
              <div key={label} className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
                <p className="text-3xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.25fr_0.75fr] gap-5">
        <article className="bg-white border border-slate-200 rounded-[28px] p-6 lg:p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div><p className="text-xs font-bold tracking-widest uppercase text-blue-700">Mapa executivo</p><h2 className="text-xl font-semibold text-slate-950 mt-1">Força de relacionamento no RS</h2></div>
            <span className="text-xs text-slate-400">Protótipo visual</span>
          </div>
          <div className="relative min-h-[520px] rounded-[30px] border border-slate-200 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50">
            <div className="absolute inset-8 rounded-[45%_30%_50%_35%/30%_45%_35%_55%] border-[18px] border-blue-100/70 rotate-[-8deg]" />
            <div className="absolute inset-16 rounded-[35%_50%_30%_45%/45%_35%_55%_30%] bg-blue-50/60 rotate-[6deg]" />
            {regions.map((region) => (
              <div key={region.name} className="absolute group" style={{ left: `${region.x}%`, top: `${region.y}%` }}>
                <div className={`w-4 h-4 rounded-full ${strengthClass(region.strength)} ring-4 ring-white shadow-lg group-hover:scale-150 transition-transform`} />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-white/95 border border-slate-200 px-3 py-2 shadow-lg opacity-90 group-hover:opacity-100">
                  <p className="text-xs font-bold text-slate-900">{region.name}</p><p className="text-[10px] text-slate-500">Força {region.strength}/100</p>
                </div>
              </div>
            ))}
            <div className="absolute left-5 bottom-5 rounded-2xl bg-white/95 border border-slate-200 p-4 shadow-sm">
              <div className="flex gap-4 text-[11px] text-slate-600 flex-wrap">
                <span><i className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1"/>forte</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1"/>médio-alto</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-1"/>atenção</span><span><i className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 mr-1"/>prioridade</span>
              </div>
            </div>
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-[28px] border border-blue-100 bg-blue-950 text-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-blue-300">Diretoria em 10 segundos</p>
            <h3 className="text-2xl font-bold mt-2">Fronteira Oeste é a maior oportunidade imediata</h3>
            <p className="mt-3 text-sm text-blue-100 leading-relaxed">Baixo alcance, poucos vereadores ativos e cadastros incompletos indicam espaço para uma jornada regional dedicada.</p>
            <div className="mt-5 rounded-2xl bg-white/10 p-4 border border-white/10"><p className="text-xs text-blue-200">Ação sugerida</p><p className="font-semibold mt-1">Campanha regional + contato das Câmaras + convite para próximo evento</p></div>
          </article>
          <article className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Cobertura regional</p>
            <div className="mt-4 space-y-4">
              {regions.slice(0,6).map(region => (
                <div key={region.name}><div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700">{region.name}</span><span className="text-slate-500">{region.reached}% alcançados</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{width:`${region.reached}%`}}/></div></div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100"><p className="text-xs font-bold tracking-widest uppercase text-blue-700">Municípios em destaque</p><h2 className="text-xl font-semibold text-slate-950 mt-1">Onde agir primeiro</h2></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-px bg-slate-100">
          {municipalities.map(([name,region,score,status]) => (
            <article key={String(name)} className="bg-white p-5"><div className="flex items-center justify-between"><div><p className="font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500 mt-1">{region}</p></div><span className="text-2xl font-bold text-blue-700">{score}</span></div><div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${strengthClass(Number(score))}`} style={{width:`${score}%`}}/></div><p className="mt-3 text-xs text-slate-500">Relacionamento {status}</p></article>
          ))}
        </div>
      </section>
    </div>
  );
}
