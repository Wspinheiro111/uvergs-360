"use client";

import Link from "next/link";
import { useState } from "react";

const etapas = ["Identificação", "Revisão", "Confirmação"];

export default function InscricaoEventoPage() {
  const [etapa, setEtapa] = useState(0);
  const [aceite, setAceite] = useState(true);

  return (
    <div className="min-h-screen bg-[#f4f8ff] text-slate-950">
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1300px] items-center gap-4 px-5 lg:px-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 font-black text-white">U</div>
          <div className="flex-1"><p className="text-sm font-black text-blue-950">UVERGS 360</p><p className="text-[10px] text-slate-400">Inscrição demonstrativa</p></div>
          <Link href="/eventos/ia-gestao-publica" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Voltar ao evento</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1300px] px-5 py-10 lg:px-10 lg:py-14">
        <section className="grid gap-7 xl:grid-cols-[.72fr_1.28fr]">
          <aside className="rounded-[34px] bg-gradient-to-br from-blue-950 via-blue-800 to-cyan-600 p-7 text-white shadow-2xl shadow-blue-200/60 lg:p-9">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-blue-100">24 de setembro • Porto Alegre</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-.045em]">Inteligência Artificial na Gestão Pública</h1>
            <p className="mt-4 text-sm leading-relaxed text-blue-100">Uma inscrição simples, rastreável e conectada ao relacionamento do vereador com a UVERGS.</p>

            <div className="mt-8 space-y-3">
              {etapas.map((nome, i) => (
                <div key={nome} className={`flex items-center gap-3 rounded-2xl border p-4 ${i === etapa ? "border-white/30 bg-white/15" : i < etapa ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-white/5"}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${i < etapa ? "bg-emerald-300 text-emerald-950" : i === etapa ? "bg-white text-blue-800" : "bg-white/10 text-white"}`}>{i < etapa ? "✓" : i + 1}</span>
                  <div><p className="text-sm font-black">{nome}</p><p className="mt-0.5 text-[10px] text-blue-100">{i === 0 ? "Dados já conhecidos podem vir preenchidos" : i === 1 ? "Conferência antes de confirmar" : "Credencial liberada"}</p></div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Origem mensurável</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-blue-200">Campanha</p><p className="mt-1 font-black">IA • Missões</p></div><div><p className="text-blue-200">Canal</p><p className="mt-1 font-black">E-mail segmentado</p></div></div>
            </div>
          </aside>

          <section className="rounded-[34px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/40 lg:p-9">
            {etapa === 0 && <>
              <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Etapa 1 de 3</p><h2 className="mt-2 text-3xl font-black tracking-tight">Confirme seus dados.</h2><p className="mt-2 text-sm text-slate-500">Na experiência real, informações já existentes no Perfil 360º evitam retrabalho.</p></div>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {[["Nome completo","Ana Martins"],["Câmara","Câmara Municipal de Santo Ângelo"],["E-mail","ana.martins@exemplo.demo"],["Telefone","(55) 99999-0142"],["Cargo","Vereadora"],["Região","Missões"]].map(([label,value])=><label key={label} className="block"><span className="text-xs font-bold text-slate-500">{label}</span><div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700">{value}</div></label>)}
              </div>
              <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><input type="checkbox" checked={aceite} onChange={e=>setAceite(e.target.checked)} className="mt-0.5 h-4 w-4"/><span className="text-xs leading-relaxed text-emerald-900"><b>Preferência de comunicação demonstrativa:</b> aceito receber informações operacionais deste evento. Em produção, finalidade, base legal e preferências devem seguir a política definida pela UVERGS.</span></label>
              <button disabled={!aceite} onClick={()=>setEtapa(1)} className="mt-7 w-full rounded-2xl bg-blue-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-40">Revisar inscrição →</button>
            </>}

            {etapa === 1 && <>
              <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Etapa 2 de 3</p><h2 className="mt-2 text-3xl font-black tracking-tight">Tudo certo para participar.</h2><p className="mt-2 text-sm text-slate-500">Uma última conferência antes de gerar a inscrição e a credencial.</p></div>
              <div className="mt-7 overflow-hidden rounded-[26px] border border-slate-200">
                {[["Participante","Ana Martins"],["Instituição","Câmara Municipal de Santo Ângelo"],["Evento","Inteligência Artificial na Gestão Pública"],["Data","24/09/2026"],["Local","Porto Alegre/RS"],["Origem atribuída","Campanha IA • Missões • E-mail"]].map(([a,b],i)=><div key={a} className={`grid gap-1 px-5 py-4 sm:grid-cols-[180px_1fr] ${i<5?"border-b border-slate-100":""}`}><p className="text-xs font-bold text-slate-400">{a}</p><p className="text-sm font-black text-slate-800">{b}</p></div>)}
              </div>
              <div className="mt-5 rounded-2xl bg-blue-50 p-5"><p className="text-xs font-black text-blue-800">O que acontece ao confirmar?</p><div className="mt-3 grid gap-2 text-xs text-blue-700 sm:grid-cols-3"><span>✓ inscrição registrada</span><span>✓ credencial liberada</span><span>✓ jornada atualizada</span></div></div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button onClick={()=>setEtapa(0)} className="rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-600 sm:w-40">Voltar</button><button onClick={()=>setEtapa(2)} className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-100">Confirmar inscrição</button></div>
            </>}

            {etapa === 2 && <div className="py-6 text-center lg:py-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-100 text-4xl text-emerald-700">✓</div>
              <span className="mt-6 inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">Inscrição confirmada</span>
              <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-black tracking-[-.045em] lg:text-5xl">Agora o relacionamento continua.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">A inscrição saiu da campanha, entrou no evento e agora libera a credencial digital. Depois do check-in, a presença poderá liberar o certificado e alimentar o Perfil 360º.</p>
              <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-4">{[["1","Campanha","atribuída"],["2","Inscrição","confirmada"],["3","Credencial","liberada"],["4","Check-in","próximo passo"]].map(([n,a,b])=><div key={n} className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">{n}</span><p className="mt-3 text-xs font-black text-blue-950">{a}</p><p className="mt-1 text-[10px] text-blue-600">{b}</p></div>)}</div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/portal/vereador/credencial/ia-gestao-publica" className="rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-black text-white">Abrir minha credencial →</Link><Link href="/portal/vereador" className="rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-black text-slate-600">Ir para Meu UVERGS</Link></div>
            </div>}
          </section>
        </section>

        <section className="mt-6 rounded-[26px] border border-amber-100 bg-amber-50 p-5 text-xs leading-relaxed text-amber-900"><b>Demonstração:</b> o fluxo é navegável, mas não persiste dados e não gera inscrição real. Ele existe para demonstrar a experiência ponta a ponta antes da integração com autenticação, banco, regras de vagas e pagamentos.</section>
      </main>
    </div>
  );
}
