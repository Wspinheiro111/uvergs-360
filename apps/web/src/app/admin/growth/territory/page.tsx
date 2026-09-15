const regions = [
  { name: "Missões", strength: 88, reached: 76, active: 64, priority: "Expandir participação recorrente" },
  { name: "Noroeste", strength: 82, reached: 73, active: 61, priority: "Converter alto engajamento em inscrições" },
  { name: "Alto Jacuí", strength: 71, reached: 62, active: 47, priority: "Aumentar ativação de portal" },
  { name: "Central", strength: 77, reached: 68, active: 56, priority: "Ampliar recorrência em eventos" },
  { name: "Metropolitana", strength: 84, reached: 81, active: 70, priority: "Trabalhar campanhas por afinidade" },
  { name: "Serra", strength: 74, reached: 66, active: 51, priority: "Recuperar contatos inativos" },
  { name: "Fronteira Oeste", strength: 52, reached: 41, active: 29, priority: "Prospectar e completar contatos" },
  { name: "Sul", strength: 58, reached: 49, active: 34, priority: "Abrir relacionamento institucional" },
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

const cityMarkers = [
  { name: "Porto Alegre", left: 81.38, top: 45.22 },
  { name: "Pelotas", left: 66.7, top: 68.18 },
  { name: "Uruguaiana", left: 11.59, top: 41.19 },
  { name: "Cruz Alta", left: 51.16, top: 23.34 },
  { name: "Passo Fundo", left: 65.31, top: 17.79 },
  { name: "Caxias do Sul", left: 83.23, top: 31.03 },
  { name: "Santo Ângelo", left: 41.5, top: 17.35 },
  { name: "Santa Maria", left: 48.16, top: 40.55 },
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
            <p className="mt-3 text-slate-600 max-w-3xl leading-relaxed">Uma leitura territorial sobre o mapa real do Rio Grande do Sul para identificar municípios, regiões e Câmaras com maior potencial de relacionamento, participação e expansão.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["497","Municípios reais"],["8","Regiões monitoradas"],["360º","Visão territorial"]].map(([value,label]) => (
              <div key={label} className="rounded-2xl bg-white border border-slate-200 p-4 text-center shadow-sm">
                <p className="text-3xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.3fr_0.7fr] gap-5">
        <article className="bg-white border border-slate-200 rounded-[28px] p-6 lg:p-7 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div><p className="text-xs font-bold tracking-widest uppercase text-blue-700">Mapa oficial do Rio Grande do Sul</p><h2 className="text-xl font-semibold text-slate-950 mt-1">497 municípios na Malha Municipal Digital 2025</h2></div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">IBGE • 2025</span>
          </div>

          <div className="relative min-h-[650px] rounded-[30px] border border-blue-100 overflow-hidden bg-gradient-to-br from-[#f8fbff] via-white to-sky-50 p-4 lg:p-7">
            <div className="relative mx-auto h-[610px] max-w-[900px]">
              <img
                src="https://uvergs360-diretoria.higgsfield.app/assets/maps/rs-municipios-2025.svg"
                alt="Mapa oficial do Rio Grande do Sul com os 497 municípios, baseado na Malha Municipal Digital 2025 do IBGE"
                className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_20px_40px_rgba(37,99,235,0.10)]"
              />

              {cityMarkers.map((city) => (
                <div key={city.name} className="absolute z-10 group" style={{ left: `${city.left}%`, top: `${city.top}%`, transform: "translate(-50%, -50%)" }}>
                  <span className="absolute -inset-2 rounded-full bg-blue-500/20 animate-ping" />
                  <span className="relative block h-3.5 w-3.5 rounded-full border-[3px] border-white bg-blue-700 shadow-lg" />
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-blue-100 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur">
                    <p className="text-[10px] font-black text-blue-950">{city.name}</p>
                  </div>
                </div>
              ))}

              <div className="absolute right-2 top-2 z-20 flex flex-col gap-2">
                <span className="rounded-full border border-blue-100 bg-white/95 px-3 py-1.5 text-[10px] font-black text-blue-800 shadow-sm">497 municípios reais</span>
                <span className="rounded-full border border-emerald-100 bg-white/95 px-3 py-1.5 text-[10px] font-black text-emerald-700 shadow-sm">5 mil vereadores-alvo</span>
              </div>

              <div className="absolute bottom-2 left-2 z-20 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fonte cartográfica</p>
                <p className="mt-1 text-xs font-bold text-slate-700">Malha Municipal Digital 2025 • IBGE</p>
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
