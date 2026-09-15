"use client";

import { useMemo, useState } from "react";

const segments = [
  { key: "high", label: "Alta oportunidade", people: 824, conversion: 34, color: "from-blue-700 to-cyan-500" },
  { key: "inactive", label: "Reativação 12+ meses", people: 611, conversion: 16, color: "from-amber-500 to-orange-400" },
  { key: "new", label: "Nunca participaram", people: 1187, conversion: 11, color: "from-emerald-600 to-teal-400" },
  { key: "regional", label: "Região do evento", people: 463, conversion: 29, color: "from-violet-600 to-fuchsia-400" },
];

const channels = [
  ["E-mail", 91, "R$ 0,07", "Conteúdo e convite"],
  ["SMS", 74, "R$ 0,18", "Urgência e lembrete"],
  ["Portal", 63, "R$ 0,00", "Relacionamento contínuo"],
  ["Telefone", 38, "Equipe", "Leads prioritários"],
];

export default function CampaignsPage() {
  const [selected, setSelected] = useState(["high", "regional"]);
  const total = useMemo(() => segments.filter(s => selected.includes(s.key)).reduce((n,s)=>n+s.people,0), [selected]);
  const expected = Math.round(segments.filter(s => selected.includes(s.key)).reduce((n,s)=>n+s.people*(s.conversion/100),0));
  const revenue = expected * 700;

  function toggle(key:string){ setSelected(v => v.includes(key) ? v.filter(x=>x!==key) : [...v,key]); }

  return <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
    <section className="rounded-[36px] overflow-hidden bg-gradient-to-br from-[#071b3f] via-[#123f86] to-[#0ea5c6] text-white shadow-[0_28px_90px_-34px_rgba(2,42,105,.5)]">
      <div className="p-8 lg:p-10 grid lg:grid-cols-[1.25fr_.75fr] gap-8 items-center">
        <div><span className="inline-flex rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest">Central de Campanhas</span><h1 className="mt-4 text-4xl lg:text-5xl font-bold tracking-tight max-w-4xl">Antes de disparar, saber quem tem maior chance de dizer sim.</h1><p className="mt-4 text-blue-100 max-w-3xl leading-relaxed">Planejamento de público, canais, conversão estimada e impacto potencial em receita de eventos, tudo em um único fluxo.</p></div>
        <div className="grid grid-cols-2 gap-3">{[[total.toLocaleString("pt-BR"),"Público selecionado"],[expected.toLocaleString("pt-BR"),"Inscrições estimadas"],[`${Math.round((expected/Math.max(total,1))*100)}%`,`Conversão projetada`],[revenue.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),"Receita potencial"]].map(([v,l])=><div key={l} className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur"><p className="text-2xl font-bold">{v}</p><p className="text-[11px] text-blue-100 mt-1">{l}</p></div>)}</div>
      </div>
    </section>

    <section className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
      <article className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm">
        <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Monte o público</p><h2 className="text-2xl font-bold text-slate-950 mt-1">Segmentos inteligentes</h2><p className="mt-2 text-sm text-slate-500">Clique nos segmentos para simular o público do próximo evento.</p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">{segments.map(s => {const active=selected.includes(s.key);return <button key={s.key} onClick={()=>toggle(s.key)} className={`text-left rounded-[24px] border p-5 transition-all ${active?"border-blue-400 shadow-lg shadow-blue-100 -translate-y-1":"border-slate-200 hover:border-blue-200"}`}><div className="flex items-center justify-between"><div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center font-bold`}>{active?"✓":"+"}</div><span className="text-3xl font-bold text-slate-950">{s.people.toLocaleString("pt-BR")}</span></div><h3 className="mt-4 font-semibold text-slate-900">{s.label}</h3><p className="text-xs text-slate-500 mt-1">Conversão histórica estimada: {s.conversion}%</p></button>})}</div>
      </article>

      <article className="bg-white border border-slate-200 rounded-[30px] p-6 shadow-sm">
        <p className="text-xs font-bold tracking-widest uppercase text-blue-700">Jornada sugerida</p><h2 className="text-2xl font-bold text-slate-950 mt-1">Campanha em 5 movimentos</h2>
        <div className="mt-6 space-y-3">{[["D-30","Lançamento","E-mail"],["D-20","Conteúdo e palestrantes","E-mail + Portal"],["D-15","Retargeting de interessados","E-mail"],["D-7","Urgência","SMS"],["D-1","Lembrete para inscritos","SMS + Portal"]].map(([day,title,channel],i)=><div key={day} className="flex gap-4 items-center rounded-2xl bg-slate-50 border border-slate-100 p-4"><div className="w-11 h-11 rounded-2xl bg-blue-700 text-white flex items-center justify-center text-xs font-bold">{day}</div><div className="flex-1"><p className="font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-500 mt-1">{channel}</p></div><span className="text-slate-300 font-bold">0{i+1}</span></div>)}</div>
      </article>
    </section>

    <section className="grid lg:grid-cols-4 gap-4">{channels.map(([name,reach,cost,use])=><article key={name} className="bg-white border border-slate-200 rounded-[26px] p-5 shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{name}</p><span className="text-xs font-bold text-blue-700">{reach}% alcance</span></div><div className="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-700 to-cyan-400" style={{width:`${reach}%`}} /></div><div className="mt-4 flex justify-between text-xs"><span className="text-slate-500">{use}</span><span className="font-semibold text-slate-700">{cost}</span></div></article>)}</section>

    <section className="grid lg:grid-cols-[.8fr_1.2fr] gap-5">
      <article className="rounded-[30px] bg-slate-950 text-white p-6"><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Recomendação automática</p><h3 className="text-2xl font-bold mt-2">Não falar com todos igual.</h3><p className="text-slate-300 mt-3 leading-relaxed">O sistema prioriza quem já demonstrou intenção, adapta a mensagem por interesse e usa o canal disponível para cada pessoa.</p></article>
      <article className="rounded-[30px] bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border border-emerald-100 p-6"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Impacto financeiro da inteligência</p><div className="mt-4 grid sm:grid-cols-3 gap-3">{[["+10% conversão","+ R$ 57.680"],["+20% conversão","+ R$ 115.360"],["+30% conversão","+ R$ 173.040"]].map(([a,b])=><div key={a} className="rounded-2xl bg-white border border-emerald-100 p-5"><p className="text-sm text-slate-500">{a}</p><p className="text-xl font-bold text-emerald-700 mt-1">{b}</p><p className="text-[10px] text-slate-400 mt-2">Cenário ilustrativo da demo</p></div>)}</div></article>
    </section>
  </div>;
}
