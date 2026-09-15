"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const filaDemo = [
  { nome: "Ana Martins", camara: "Santo Ângelo", hora: "09:12", status: "Credenciada" },
  { nome: "Carlos Ribeiro", camara: "Ijuí", hora: "09:11", status: "Credenciado" },
  { nome: "Marina Lopes", camara: "Santa Rosa", hora: "09:10", status: "Credenciada" },
  { nome: "João Becker", camara: "Cerro Largo", hora: "09:09", status: "Credenciado" },
];

const proximos = [
  ["Luciana Freitas", "São Luiz Gonzaga"],
  ["Ricardo Weber", "Panambi"],
  ["Marta Silveira", "Cruz Alta"],
  ["Paulo Nunes", "Santo Cristo"],
  ["Cláudia Stein", "Três de Maio"],
];

export default function CheckinAoVivoPage() {
  const [presentes, setPresentes] = useState(86);
  const [recentes, setRecentes] = useState(filaDemo);
  const [indice, setIndice] = useState(0);
  const [mensagem, setMensagem] = useState("Scanner pronto para leitura");

  const taxa = useMemo(() => ((presentes / 142) * 100).toFixed(1).replace(".", ","), [presentes]);

  function simularLeitura() {
    if (indice >= proximos.length) {
      setMensagem("Demonstração concluída: todos os QR de teste foram processados.");
      return;
    }
    const [nome, camara] = proximos[indice];
    const agora = new Date();
    const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setPresentes((v) => Math.min(142, v + 1));
    setRecentes((lista) => [{ nome, camara, hora, status: "Credenciado" }, ...lista].slice(0, 6));
    setIndice((v) => v + 1);
    setMensagem(`✓ ${nome} credenciado com sucesso`);
  }

  return (
    <div className="min-h-screen bg-[#f6f9fe] p-6 text-slate-950 lg:p-10">
      <div className="mx-auto max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 p-7 text-white shadow-2xl shadow-emerald-200/50 lg:p-10">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[54px] border-white/10" />
          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-emerald-100">Check-in ao vivo</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-emerald-800"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Operação ativa</span>
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.045em] lg:text-6xl">Credenciamento rápido, presença confirmada na hora.</h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-emerald-50 lg:text-lg">Inteligência Artificial na Gestão Pública • credenciamento demonstrativo por QR Code.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/growth/events" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-800">Ver Evento 360</Link>
              <Link href="/portal/vereador/credencial/ia-gestao-publica" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white">Abrir credencial</Link>
            </div>
          </div>

          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["142","inscritos"],[String(presentes),"presentes agora"],[`${taxa}%`,"show rate atual"],[String(142-presentes),"ainda não chegaram"]].map(([v,l])=><div key={l} className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur"><p className="text-3xl font-black">{v}</p><p className="mt-2 text-xs text-emerald-50">{l}</p></div>)}
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
          <article className="rounded-[32px] border border-emerald-100 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-700">Estação 01</p><h2 className="mt-2 text-3xl font-black tracking-tight">Leitor de QR</h2></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">ONLINE</span>
            </div>

            <div className="mt-6 rounded-[30px] bg-slate-950 p-6 text-white">
              <div className="relative mx-auto flex aspect-square max-w-[330px] items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="absolute inset-8 rounded-[22px] border-2 border-dashed border-emerald-300/60" />
                <div className="absolute left-10 right-10 top-1/2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_18px_rgba(110,231,183,.9)]" />
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">▦</div>
                  <p className="mt-4 text-sm font-black">Aponte o QR da credencial</p>
                  <p className="mt-1 text-xs text-slate-400">câmera simulada para demonstração</p>
                </div>
              </div>
              <button onClick={simularLeitura} className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-3.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-300">Simular leitura de QR</button>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-center text-xs font-bold text-emerald-200">{mensagem}</div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo médio</p><p className="mt-2 text-2xl font-black">6s</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estações</p><p className="mt-2 text-2xl font-black">3 ativas</p></div>
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Fluxo em tempo real</p><h2 className="mt-2 text-3xl font-black tracking-tight">Últimos credenciamentos</h2></div><span className="text-xs font-bold text-slate-400">Atualização local demonstrativa</span></div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1.2fr_.8fr_.4fr_.5fr] gap-3 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 md:grid"><span>Participante</span><span>Câmara</span><span>Hora</span><span>Status</span></div>
              {recentes.map((p,i)=><div key={`${p.nome}-${p.hora}-${i}`} className={`grid gap-2 px-5 py-4 md:grid-cols-[1.2fr_.8fr_.4fr_.5fr] md:items-center ${i<recentes.length-1?"border-b border-slate-100":""}`}><div><p className="text-sm font-black text-slate-800">{p.nome}</p><p className="mt-1 text-[10px] text-slate-400">Vereador(a)</p></div><p className="text-xs font-semibold text-slate-500">{p.camara}</p><p className="text-xs font-black text-slate-600">{p.hora}</p><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">✓ {p.status}</span></div>)}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] bg-blue-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">09h–10h</p><p className="mt-2 text-3xl font-black text-blue-900">64</p><p className="mt-1 text-xs text-blue-600">pico de entradas</p></div>
              <div className="rounded-[24px] bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sem pendência</p><p className="mt-2 text-3xl font-black text-emerald-900">98%</p><p className="mt-1 text-xs text-emerald-700">cadastros válidos</p></div>
              <div className="rounded-[24px] bg-amber-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Atenção</p><p className="mt-2 text-3xl font-black text-amber-900">3</p><p className="mt-1 text-xs text-amber-700">cadastros para revisão</p></div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 lg:p-8">
            <p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-700">Depois do check-in</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">A presença alimenta automaticamente o relacionamento.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">{[["1","QR lido"],["2","presença confirmada"],["3","Perfil 360º atualizado"],["4","certificado liberado"]].map(([n,t])=><div key={n} className="rounded-2xl border border-blue-100 bg-white p-4"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">{n}</span><p className="mt-3 text-sm font-black text-slate-800">{t}</p></div>)}</div>
          </article>
          <article className="rounded-[32px] bg-gradient-to-br from-emerald-700 to-teal-600 p-6 text-white lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-100">Operação sem papel</p><h2 className="mt-2 text-3xl font-black">Credencial digital → presença → certificado.</h2><p className="mt-4 text-sm leading-relaxed text-emerald-50">Na versão de produção, o check-in deverá registrar operador, estação, horário e identificador do evento em trilha auditável, com proteção contra leitura duplicada.</p><Link href="/portal/vereador/certificados/ia-gestao-publica" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-800">Ver certificado automático →</Link></article>
        </section>

        <section className="mt-6 rounded-[28px] border border-amber-100 bg-amber-50 p-5 text-xs leading-relaxed text-amber-900"><b>Demonstração:</b> este painel não grava presença real, não acessa câmera e não altera banco de dados. Os números e participantes são sintéticos.</section>
      </div>
    </div>
  );
}
