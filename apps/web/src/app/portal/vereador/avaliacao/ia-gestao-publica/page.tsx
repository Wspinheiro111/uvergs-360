"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const temas = ["Inteligência Artificial", "Gestão pública", "Fiscalização", "Comunicação", "Liderança", "Orçamento público"];

export default function AvaliacaoEventoPage() {
  const [nota, setNota] = useState<number | null>(9);
  const [interesses, setInteresses] = useState<string[]>(["Inteligência Artificial", "Gestão pública"]);
  const [comentario, setComentario] = useState("Conteúdo muito aplicável ao mandato. Gostaria de uma oficina avançada.");
  const [proximos, setProximos] = useState(true);
  const [enviado, setEnviado] = useState(false);

  const perfil = useMemo(() => {
    if (nota === null) return "Aguardando avaliação";
    if (nota >= 9) return "Promotor • alta afinidade";
    if (nota >= 7) return "Neutro • manter relacionamento";
    return "Detrator • recuperar experiência";
  }, [nota]);

  function toggleTema(tema: string) {
    setInteresses((atuais) => atuais.includes(tema) ? atuais.filter((item) => item !== tema) : [...atuais, tema]);
  }

  return (
    <div className="min-h-screen bg-[#f4f8ff] text-slate-950">
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1300px] items-center gap-4 px-5 lg:px-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 font-black text-white">U</div>
          <div className="flex-1"><p className="text-sm font-black text-blue-950">Meu UVERGS</p><p className="text-[10px] text-slate-400">Pós-evento • avaliação demonstrativa</p></div>
          <Link href="/portal/vereador" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Voltar ao portal</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1300px] px-5 py-10 lg:px-10 lg:py-14">
        {!enviado ? <section className="grid gap-7 xl:grid-cols-[.72fr_1.28fr]">
          <aside className="rounded-[34px] bg-gradient-to-br from-violet-900 via-blue-800 to-cyan-600 p-7 text-white shadow-2xl shadow-blue-200/60 lg:p-9">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-blue-100">Pós-evento</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-.045em]">O evento acabou. O relacionamento não.</h1>
            <p className="mt-4 text-sm leading-relaxed text-blue-100">A avaliação transforma satisfação, interesse e intenção em dados para a próxima melhor ação da UVERGS.</p>

            <div className="mt-8 space-y-3">
              {[["1","Presença","confirmada por check-in"],["2","Certificado","liberado automaticamente"],["3","Avaliação","NPS + temas de interesse"],["4","Próxima ação","nova jornada personalizada"]].map(([n,t,d])=><div key={n} className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-blue-800">{n}</span><div><p className="text-sm font-black">{t}</p><p className="mt-1 text-[10px] text-blue-100">{d}</p></div></div>)}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Perfil após esta resposta</p><p className="mt-2 text-xl font-black">{perfil}</p><p className="mt-2 text-xs leading-relaxed text-blue-100">Na produção, a classificação deve ser explicável e baseada apenas em sinais permitidos para a finalidade institucional.</p></div>
          </aside>

          <section className="rounded-[34px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/40 lg:p-9">
            <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-violet-600">Sua experiência</p><h2 className="mt-2 text-3xl font-black tracking-tight">Como foi o evento?</h2><p className="mt-2 text-sm text-slate-500">Inteligência Artificial na Gestão Pública • 24/09/2026</p></div>

            <div className="mt-7 rounded-[26px] bg-slate-50 p-5 lg:p-6">
              <p className="text-sm font-black text-slate-800">De 0 a 10, qual a chance de você recomendar um evento da UVERGS?</p>
              <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-11">{Array.from({length:11},(_,i)=>i).map((n)=><button key={n} onClick={()=>setNota(n)} className={`aspect-square rounded-xl text-sm font-black transition ${nota===n?"bg-blue-700 text-white shadow-lg shadow-blue-200":"border border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>{n}</button>)}</div>
              <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400"><span>Não recomendaria</span><span>Recomendaria muito</span></div>
            </div>

            <div className="mt-6"><p className="text-sm font-black text-slate-800">Quais temas você quer ver nos próximos eventos?</p><div className="mt-3 flex flex-wrap gap-2">{temas.map((tema)=><button key={tema} onClick={()=>toggleTema(tema)} className={`rounded-full px-4 py-2 text-xs font-black transition ${interesses.includes(tema)?"bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200":"bg-slate-100 text-slate-500"}`}>{interesses.includes(tema)?"✓ ":""}{tema}</button>)}</div></div>

            <label className="mt-6 block"><span className="text-sm font-black text-slate-800">O que podemos melhorar ou aprofundar?</span><textarea value={comentario} onChange={(e)=>setComentario(e.target.value)} rows={4} className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white" /></label>

            <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4"><input type="checkbox" checked={proximos} onChange={(e)=>setProximos(e.target.checked)} className="mt-0.5 h-4 w-4"/><span className="text-xs leading-relaxed text-blue-900"><b>Quero continuar próximo:</b> demonstrativamente, sinalizo interesse em receber informações de próximos eventos relacionados aos temas selecionados.</span></label>

            <button disabled={nota===null} onClick={()=>setEnviado(true)} className="mt-7 w-full rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-40">Enviar avaliação demonstrativa</button>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">Nenhum dado é persistido. Esta tela demonstra a experiência e a lógica de relacionamento pós-evento.</p>
          </section>
        </section> : <section className="mx-auto max-w-5xl overflow-hidden rounded-[38px] border border-emerald-100 bg-white text-center shadow-2xl shadow-emerald-100/50">
          <div className="bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 px-6 py-10 text-white lg:px-10 lg:py-14"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/15 text-4xl">✓</div><p className="mt-6 text-[11px] font-black uppercase tracking-[.22em] text-emerald-100">Obrigado pela participação</p><h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black tracking-[-.045em] lg:text-6xl">Sua resposta vira relacionamento.</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-emerald-50">A UVERGS passa a saber não apenas que você esteve no evento, mas o que interessou e qual pode ser o próximo conteúdo relevante.</p></div>
          <div className="p-6 lg:p-10">
            <div className="grid gap-3 text-left sm:grid-cols-3"><div className="rounded-2xl bg-blue-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">NPS demo</p><p className="mt-2 text-3xl font-black text-blue-900">{nota}</p><p className="mt-1 text-xs text-blue-600">{perfil}</p></div><div className="rounded-2xl bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Interesses</p><p className="mt-2 text-3xl font-black text-emerald-900">{interesses.length}</p><p className="mt-1 text-xs text-emerald-700">temas selecionados</p></div><div className="rounded-2xl bg-violet-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Próxima ação</p><p className="mt-2 text-sm font-black text-violet-950">Convidar para oficina avançada de IA</p><p className="mt-1 text-xs text-violet-700">recomendação demonstrativa</p></div></div>
            <div className="mt-6 rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 text-left"><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Atualização do Perfil 360º</p><div className="mt-4 grid gap-3 sm:grid-cols-4">{[["Presença","confirmada"],["Satisfação",String(nota)],["Afinidade","IA + gestão"],["Intenção","próximos eventos"]].map(([a,b])=><div key={a} className="rounded-2xl bg-white p-4 ring-1 ring-blue-100"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{a}</p><p className="mt-2 text-sm font-black text-slate-800">{b}</p></div>)}</div></div>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/portal/vereador/certificados/ia-gestao-publica" className="rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-black text-white">Ver meu certificado</Link><Link href="/portal/vereador" className="rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-black text-slate-600">Voltar ao Meu UVERGS</Link></div>
          </div>
        </section>}

        <section className="mt-6 rounded-[26px] border border-amber-100 bg-amber-50 p-5 text-xs leading-relaxed text-amber-900"><b>Demonstração:</b> NPS, interesses, comentário e próxima ação são apenas dados locais de interface e não são gravados. Em produção, pesquisa, consentimentos/preferências, retenção e uso desses sinais deverão seguir a política institucional e LGPD.</section>
      </main>
    </div>
  );
}
