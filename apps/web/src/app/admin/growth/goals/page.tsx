"use client";

import { useMemo, useState } from "react";

const cenarios = [
  { nome: "Conservador", reg: 3, grande: 20, descricao: "ganho gradual" },
  { nome: "Central", reg: 5, grande: 35, descricao: "meta de referência" },
  { nome: "Expansão", reg: 8, grande: 50, descricao: "crescimento forte" },
];

function dinheiro(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(valor);
}

function numero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

export default function MetasImpactoPage() {
  const [regulares, setRegulares] = useState(26);
  const [grandes, setGrandes] = useState(4);
  const [mediaRegular, setMediaRegular] = useState(15);
  const [mediaGrande, setMediaGrande] = useState(125);
  const [ticket, setTicket] = useState(1200);
  const [ganhoRegular, setGanhoRegular] = useState(5);
  const [ganhoGrande, setGanhoGrande] = useState(35);

  const dados = useMemo(() => {
    const participantesBase = regulares * mediaRegular + grandes * mediaGrande;
    const receitaBase = participantesBase * ticket;
    const novos = regulares * ganhoRegular + grandes * ganhoGrande;
    const participantesMeta = participantesBase + novos;
    const receitaAdicional = novos * ticket;
    const receitaMeta = receitaBase + receitaAdicional;
    const crescimento = participantesBase > 0 ? (novos / participantesBase) * 100 : 0;
    return { participantesBase, receitaBase, novos, participantesMeta, receitaAdicional, receitaMeta, crescimento };
  }, [regulares, grandes, mediaRegular, mediaGrande, ticket, ganhoRegular, ganhoGrande]);

  function aplicar(nome: string) {
    const cenario = cenarios.find((item) => item.nome === nome);
    if (!cenario) return;
    setGanhoRegular(cenario.reg);
    setGanhoGrande(cenario.grande);
  }

  return (
    <div className="min-h-screen bg-[#f6f9fe] p-6 text-slate-950 lg:p-10">
      <div className="mx-auto max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-900 via-indigo-800 to-violet-700 p-7 text-white shadow-2xl shadow-blue-200/50 lg:p-10">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[52px] border-white/10" />
          <div className="relative grid gap-8 xl:grid-cols-[1fr_430px] xl:items-end">
            <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-blue-100">Metas & Impacto</span><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-[10px] font-black text-emerald-200">Planejamento demonstrativo</span></div><h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.045em] lg:text-6xl">Quanto vale trazer mais vereadores para cada evento?</h1><p className="mt-5 max-w-3xl text-base leading-relaxed text-blue-100 lg:text-lg">Transforme a meta de relacionamento em objetivo operacional: quantos participantes adicionais por evento, quanto isso representa no ano e qual cenário a equipe quer perseguir.</p></div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Cenário atual selecionado</p><div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-5xl font-black">+{numero(dados.novos)}</p><p className="mt-2 text-xs text-blue-100">participações adicionais/ano</p></div><div className="text-right"><p className="text-2xl font-black text-emerald-300">+{dados.crescimento.toFixed(1).replace(".", ",")}%</p><p className="mt-1 text-[10px] text-blue-100">sobre a base estimada</p></div></div></div>
          </div>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[numero(dados.participantesBase),"participações anuais estimadas hoje"],[dinheiro(dados.receitaBase),"receita bruta anual de referência"],[dinheiro(dados.receitaAdicional),"potencial bruto adicional"],[dinheiro(dados.receitaMeta),"receita bruta no cenário-meta"]].map(([v,l])=><div key={l} className="rounded-[24px] border border-white/10 bg-white/10 p-5"><p className="text-2xl font-black lg:text-3xl">{v}</p><p className="mt-2 text-xs leading-relaxed text-blue-100">{l}</p></div>)}</div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Premissas da operação</p><h2 className="mt-2 text-3xl font-black tracking-tight">Ajuste os números.</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Valores iniciais configurados com base na operação informada: cerca de 30 eventos/ano, quatro deles maiores, e inscrição em torno de R$ 1.200.</p></div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {[
                ["Eventos regulares/ano", regulares, setRegulares, 0, 60],
                ["Eventos grandes/ano", grandes, setGrandes, 0, 20],
                ["Média atual • regular", mediaRegular, setMediaRegular, 0, 300],
                ["Média atual • grande", mediaGrande, setMediaGrande, 0, 500],
                ["Inscrição média (R$)", ticket, setTicket, 0, 10000],
              ].map(([label, value, setter, min, max]) => <label key={String(label)} className="block"><span className="text-xs font-black text-slate-500">{String(label)}</span><input type="number" min={Number(min)} max={Number(max)} value={Number(value)} onChange={(e)=>{ const fn = setter as (n:number)=>void; fn(Math.max(Number(min), Number(e.target.value) || 0)); }} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-lg font-black text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white" /></label>)}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-5"><div className="flex items-center justify-between gap-4"><span className="text-xs font-bold text-slate-500">Total de eventos/ano</span><b className="text-xl text-slate-900">{regulares + grandes}</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-400" style={{width:`${Math.min(100, ((regulares+grandes)/40)*100)}%`}}/></div></div>
          </article>

          <article className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-700">Meta de crescimento</p><h2 className="mt-2 text-3xl font-black tracking-tight">Defina o ganho por evento.</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-700">SIMULADOR AO VIVO</span></div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="rounded-[26px] border border-blue-100 bg-white p-5"><span className="text-xs font-black text-blue-600">Novos por evento regular</span><div className="mt-4 flex items-center gap-4"><button onClick={()=>setGanhoRegular(Math.max(0,ganhoRegular-1))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-600">−</button><span className="flex-1 text-center text-5xl font-black text-blue-900">+{ganhoRegular}</span><button onClick={()=>setGanhoRegular(ganhoRegular+1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xl font-black text-white">+</button></div><p className="mt-4 text-center text-xs text-slate-400">{regulares} eventos × +{ganhoRegular} = <b className="text-slate-700">+{regulares*ganhoRegular}</b></p></label><label className="rounded-[26px] border border-violet-100 bg-white p-5"><span className="text-xs font-black text-violet-600">Novos por evento grande</span><div className="mt-4 flex items-center gap-4"><button onClick={()=>setGanhoGrande(Math.max(0,ganhoGrande-5))} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-600">−</button><span className="flex-1 text-center text-5xl font-black text-violet-900">+{ganhoGrande}</span><button onClick={()=>setGanhoGrande(ganhoGrande+5)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-700 text-xl font-black text-white">+</button></div><p className="mt-4 text-center text-xs text-slate-400">{grandes} eventos × +{ganhoGrande} = <b className="text-slate-700">+{grandes*ganhoGrande}</b></p></label></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">{cenarios.map((c)=><button key={c.nome} onClick={()=>aplicar(c.nome)} className={`rounded-2xl border p-4 text-left transition ${ganhoRegular===c.reg&&ganhoGrande===c.grande?"border-emerald-300 bg-emerald-100":"border-slate-200 bg-white hover:border-emerald-200"}`}><p className="text-xs font-black text-slate-800">{c.nome}</p><p className="mt-1 text-[10px] text-slate-400">+{c.reg} regular • +{c.grande} grande</p><p className="mt-2 text-[10px] font-bold text-emerald-700">{c.descricao}</p></button>)}</div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-[32px] border border-blue-100 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Antes → meta</p><h2 className="mt-2 text-3xl font-black tracking-tight">O ano inteiro em uma leitura.</h2></div><span className="text-xs font-semibold text-slate-400">Simulação, não previsão garantida</span></div>
            <div className="mt-7 grid gap-4 lg:grid-cols-2"><div className="rounded-[28px] bg-slate-50 p-6"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referência atual</p><p className="mt-3 text-5xl font-black text-slate-800">{numero(dados.participantesBase)}</p><p className="mt-2 text-sm text-slate-500">participações/ano</p><div className="mt-5 border-t border-slate-200 pt-5"><p className="text-2xl font-black text-slate-700">{dinheiro(dados.receitaBase)}</p><p className="mt-1 text-xs text-slate-400">receita bruta de referência</p></div></div><div className="rounded-[28px] bg-gradient-to-br from-blue-700 to-cyan-500 p-6 text-white shadow-xl shadow-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Cenário-meta</p><p className="mt-3 text-5xl font-black">{numero(dados.participantesMeta)}</p><p className="mt-2 text-sm text-blue-100">participações/ano</p><div className="mt-5 border-t border-white/15 pt-5"><p className="text-2xl font-black">{dinheiro(dados.receitaMeta)}</p><p className="mt-1 text-xs text-blue-100">receita bruta de referência</p></div></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Participações novas</p><p className="mt-2 text-3xl font-black text-emerald-900">+{numero(dados.novos)}</p></div><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Impacto bruto</p><p className="mt-2 text-2xl font-black text-blue-900">+{dinheiro(dados.receitaAdicional)}</p></div><div className="rounded-2xl border border-violet-100 bg-violet-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Crescimento</p><p className="mt-2 text-3xl font-black text-violet-900">+{dados.crescimento.toFixed(1).replace(".", ",")}%</p></div></div>
          </article>

          <article className="rounded-[32px] bg-gradient-to-br from-[#0b2554] to-blue-800 p-6 text-white lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-300">Como o UVERGS 360 ajuda</p><h2 className="mt-2 text-3xl font-black tracking-tight">A meta deixa de ser desejo e vira operação.</h2><div className="mt-6 space-y-3">{[["01","Encontrar","quem tem maior probabilidade de interesse"],["02","Segmentar","por região, histórico e tema"],["03","Converter","campanha → inscrição → presença"],["04","Aprender","NPS e interesse alimentam o próximo ciclo"]].map(([n,t,d])=><div key={n} className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-black text-blue-800">{n}</span><div><p className="text-sm font-black">{t}</p><p className="mt-1 text-xs leading-relaxed text-blue-100">{d}</p></div></div>)}</div><div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Leitura da diretoria</p><p className="mt-2 text-lg font-black">“Quantos participantes adicionais precisamos conquistar — e onde o sistema pode ajudar?”</p></div></article>
        </section>

        <section className="mt-6 rounded-[28px] border border-amber-100 bg-amber-50 p-5 text-xs leading-relaxed text-amber-900"><b>Demonstração:</b> os cálculos são matemáticos sobre as premissas informadas na tela, mas não constituem previsão ou garantia de receita. Participação real depende de tema, calendário, capacidade, preço, comunicação, região e outros fatores. Antes de produção, as premissas devem ser parametrizadas pela UVERGS.</section>
      </div>
    </div>
  );
}
