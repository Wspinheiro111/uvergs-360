const jornadas = [
  { nome: "Convite para evento", publico: "Alta oportunidade", pessoas: 824, status: "Ativa", conversao: "34%", cor: "blue" },
  { nome: "Recuperação de inscrição", publico: "Iniciou e não concluiu", pessoas: 28, status: "Ativa", conversao: "43%", cor: "emerald" },
  { nome: "Reativação 12+ meses", publico: "Sem interação recente", pessoas: 611, status: "Rascunho", conversao: "16%", cor: "amber" },
  { nome: "Pós-evento e recorrência", publico: "Participantes recentes", pessoas: 142, status: "Ativa", conversao: "51%", cor: "cyan" },
];

const etapas = [
  ["D-30", "Convite principal", "E-mail + Portal", "Apresentar tema, valor e chamada para inscrição"],
  ["D-21", "Conteúdo de interesse", "E-mail", "Aprofundar assunto e palestrantes"],
  ["D-14", "Reforço segmentado", "SMS + Portal", "Priorizar quem abriu ou clicou"],
  ["D-7", "Recuperação", "SMS + contato", "Atuar sobre inscrições iniciadas"],
  ["D-1", "Orientação final", "E-mail + Portal", "Local, horário e credenciamento"],
  ["D+1", "Pós-evento", "E-mail", "Agradecimento, pesquisa e próximo passo"],
];

const sinais = [
  ["Clique em campanha", "+10", "Interesse recente"],
  ["Inscrição iniciada", "+15", "Intenção forte"],
  ["Participação confirmada", "+20", "Relacionamento ativo"],
  ["12 meses sem interação", "−15", "Reativação"],
];

export default function JornadasPage(){
  return <div className="min-h-screen bg-[#f6f9ff] p-6 lg:p-10 text-slate-950">
    <div className="max-w-[1500px] mx-auto">
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-indigo-800 via-blue-700 to-cyan-500 text-white p-7 lg:p-10 shadow-2xl shadow-blue-200/50">
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full border-[52px] border-white/10 translate-x-20 -translate-y-20"/>
        <div className="relative grid lg:grid-cols-[1fr_420px] gap-8 items-center">
          <div><p className="text-xs font-black uppercase tracking-[.22em] text-blue-100">Jornadas automáticas</p><h1 className="mt-3 text-4xl lg:text-6xl font-black tracking-[-.04em] leading-[.98]">Relacionamento que continua mesmo depois do primeiro contato.</h1><p className="mt-5 max-w-3xl text-blue-100 text-lg leading-relaxed">O UVERGS 360 organiza ações por comportamento: quem abriu, clicou, se inscreveu, participou ou precisa ser reativado entra na jornada certa.</p></div>
          <div className="grid grid-cols-2 gap-3">{[["4","jornadas demonstradas"],["1.605","pessoas em fluxos"],["6","momentos por evento"],["1","próxima melhor ação"]].map(([v,l])=><div key={l} className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur"><p className="text-3xl font-black">{v}</p><p className="mt-2 text-xs text-blue-100 leading-relaxed">{l}</p></div>)}</div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-4">{jornadas.map((j)=><article key={j.nome} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg ${j.cor==="emerald"?"bg-emerald-100":j.cor==="amber"?"bg-amber-100":j.cor==="cyan"?"bg-cyan-100":"bg-blue-100"}`}>⚡</div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${j.status==="Ativa"?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{j.status}</span></div><h2 className="mt-5 text-lg font-black leading-tight">{j.nome}</h2><p className="mt-2 text-xs text-slate-400">{j.publico}</p><div className="mt-5 flex items-end justify-between"><div><p className="text-3xl font-black text-slate-900">{j.pessoas}</p><p className="text-[10px] text-slate-400">pessoas</p></div><div className="text-right"><p className="text-lg font-black text-blue-700">{j.conversao}</p><p className="text-[10px] text-slate-400">conversão demo</p></div></div></article>)}</section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <article className="rounded-[32px] border border-slate-200 bg-white p-6 lg:p-8 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Jornada do próximo evento</p><h2 className="mt-2 text-3xl font-black tracking-tight">Da descoberta ao pós-evento</h2></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700">IA na Gestão Pública</span></div><div className="mt-7 space-y-3">{etapas.map(([tempo,titulo,canal,acao],i)=><div key={tempo} className="grid md:grid-cols-[80px_1fr_160px] gap-4 items-center rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${i<4?"bg-blue-700 text-white":"bg-emerald-100 text-emerald-700"}`}>{i+1}</div><b className="text-xs text-slate-500">{tempo}</b></div><div><p className="text-sm font-black text-slate-800">{titulo}</p><p className="mt-1 text-xs text-slate-400">{acao}</p></div><span className="text-xs font-bold text-blue-600">{canal}</span></div>)}</div></article>

        <article className="rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-700">Motor de sinais</p><h2 className="mt-2 text-2xl font-black">O comportamento muda a prioridade.</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">A jornada reage a fatos observáveis e permitidos, sem inferir ideologia, crenças ou outros atributos sensíveis.</p><div className="mt-6 space-y-3">{sinais.map(([evento,peso,nota])=><div key={evento} className="rounded-2xl border border-blue-100 bg-white p-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-black text-slate-800">{evento}</p><p className="mt-1 text-xs text-slate-400">{nota}</p></div><b className={`text-lg ${peso.startsWith("+")?"text-emerald-600":"text-amber-600"}`}>{peso}</b></div></div>)}</div></article>
      </section>

      <section className="mt-6 rounded-[32px] bg-[#0b2554] text-white p-7 lg:p-9"><div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-300">Próxima melhor ação</p><h2 className="mt-2 text-3xl font-black tracking-tight">18 inscrições iniciadas ainda não concluídas.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100">A recomendação demonstrativa é priorizar recuperação por SMS e contato humano apenas para quem já demonstrou intenção, reduzindo esforço e aumentando relevância.</p></div><div className="rounded-[26px] bg-white/10 border border-white/10 p-5"><div className="flex justify-between text-xs text-blue-100"><span>Probabilidade estimada</span><b className="text-white">43%</b></div><div className="mt-3 h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[43%] bg-gradient-to-r from-cyan-300 to-emerald-300 rounded-full"/></div><p className="mt-3 text-[10px] text-blue-200">Indicador ilustrativo para demonstração, não modelo preditivo em produção.</p></div></div></section>

      <footer className="mt-8 border-t border-slate-200 py-5 text-xs text-slate-400">UVERGS 360 • Jornadas de relacionamento • Demonstração com dados sintéticos</footer>
    </div>
  </div>;
}
