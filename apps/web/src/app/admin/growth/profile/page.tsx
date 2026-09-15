const timeline = [
  ["Hoje", "Abriu comunicação sobre o Seminário de IA", "Engajamento", "+8"],
  ["Há 4 dias", "Iniciou inscrição e não concluiu", "Conversão", "+12"],
  ["Há 21 dias", "Atualizou temas de interesse", "Perfil", "+5"],
  ["Há 3 meses", "Acessou certificado de evento anterior", "Relacionamento", "+6"],
  ["Há 7 meses", "Participou de evento da UVERGS", "Evento", "+20"],
];

const interests = [
  ["Inteligência Artificial", 96],
  ["Gestão Pública", 88],
  ["Captação de Recursos", 72],
  ["Comunicação Institucional", 64],
];

export default function CouncilorProfilePage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-blue-100 bg-white shadow-[0_24px_80px_-32px_rgba(30,64,175,.35)]">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute left-1/3 -bottom-28 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="relative bg-gradient-to-r from-[#0c2c67] via-[#1458b5] to-[#26a5d9] text-white p-7 lg:p-9">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="relative w-24 h-24 rounded-[28px] bg-white/15 border border-white/25 flex items-center justify-center text-3xl font-bold shadow-xl backdrop-blur">AM<div className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-emerald-400 border-4 border-[#1458b5]" /></div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold border border-white/15">Perfil 360º</span><span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100 border border-emerald-300/20">Alta oportunidade</span></div>
              <h1 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight">Ana Martins</h1>
              <p className="mt-1 text-blue-100">Vereadora · Câmara Municipal de Santo Ângelo · Missões</p>
            </div>
            <div className="grid grid-cols-3 gap-3 min-w-[360px]">
              {[["91","Oportunidade"],["82","Engajamento"],["96","Qualidade"]].map(([value,label])=><div key={label} className="rounded-2xl bg-white/10 border border-white/15 p-4 text-center backdrop-blur"><p className="text-3xl font-bold">{value}</p><p className="text-[11px] text-blue-100 mt-1">{label}</p></div>)}
            </div>
          </div>
        </div>
        <div className="relative grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          {[["Estágio","Interessada"],["Última interação","Hoje"],["Último evento","Há 7 meses"],["Portal","Ativo"]].map(([label,value])=><div key={label} className="p-5"><p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p></div>)}
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
        <div className="space-y-5">
          <article className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold tracking-widest uppercase text-blue-700">Próxima melhor ação</p><h2 className="text-2xl font-bold text-slate-950 mt-1">Retomar inscrição do próximo seminário</h2></div><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl">↗</div></div>
            <p className="mt-4 text-slate-600 leading-relaxed">Alta afinidade com o tema, interação recente com a campanha e inscrição já iniciada. É um contato com forte probabilidade de conversão.</p>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">{[["Canal sugerido","E-mail"],["Momento","Hoje"],["Probabilidade","Muito alta"]].map(([l,v])=><div key={l} className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><p className="text-xs text-slate-400">{l}</p><p className="font-semibold text-slate-800 mt-1">{v}</p></div>)}</div>
          </article>

          <article className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100"><p className="text-xs font-bold tracking-widest uppercase text-blue-700">Timeline inteligente</p><h2 className="text-xl font-semibold text-slate-950 mt-1">Histórico de relacionamento</h2></div>
            <div className="divide-y divide-slate-100">{timeline.map(([date,text,type,points])=><div key={date+text} className="p-5 flex gap-4 items-start hover:bg-blue-50/40 transition-colors"><div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">•</div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{text}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{type}</span></div><p className="text-xs text-slate-400 mt-1">{date}</p></div><span className="text-sm font-bold text-emerald-600">{points}</span></div>)}</div>
          </article>
        </div>

        <div className="space-y-5">
          <article className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Mapa de interesse</p><h2 className="text-xl font-semibold text-slate-950 mt-1">Temas com maior afinidade</h2>
            <div className="mt-5 space-y-4">{interests.map(([name,value])=><div key={String(name)}><div className="flex justify-between text-sm mb-1.5"><span className="font-medium text-slate-700">{name}</span><span className="font-bold text-slate-900">{value}%</span></div><div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400" style={{width:`${value}%`}}/></div></div>)}</div>
          </article>

          <article className="rounded-[30px] bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-emerald-700">Canais disponíveis</p><div className="mt-4 grid grid-cols-2 gap-3">{["E-mail","SMS","Portal","Telefone"].map(channel=><div key={channel} className="rounded-2xl bg-white/80 border border-white p-4"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="font-semibold text-slate-800">{channel}</span></div><p className="text-[11px] text-slate-500 mt-2">Disponível para relacionamento</p></div>)}</div>
          </article>

          <article className="rounded-[30px] bg-slate-950 text-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-widest uppercase text-blue-300">Leitura automática</p><h3 className="text-xl font-bold mt-2">Perfil com alta chance de conversão</h3><p className="mt-3 text-sm text-slate-300 leading-relaxed">O sistema combina recência, interesse, histórico de eventos e sinais de intenção para orientar a equipe sem usar partido ou ideologia.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
