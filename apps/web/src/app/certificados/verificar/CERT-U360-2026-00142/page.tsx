import Link from "next/link";

const checkpoints = [
  ["09:12", "Entrada", "QR U360-IA-2026-00142", "Confirmado"],
  ["13:48", "Retorno da tarde", "Estação 02", "Confirmado"],
  ["17:06", "Encerramento", "Regra de presença", "Confirmado"],
];

export default function VerificarCertificadoPage() {
  return (
    <div className="min-h-screen bg-[#f4f8ff] text-slate-950">
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1300px] items-center gap-4 px-5 lg:px-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 font-black text-white">U</div>
          <div className="flex-1"><p className="text-sm font-black text-blue-950">UVERGS 360</p><p className="text-[10px] text-slate-400">Verificação pública de certificado</p></div>
          <Link href="/" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">UVERGS 360</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1300px] px-5 py-10 lg:px-10 lg:py-14">
        <section className="grid gap-7 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <article className="overflow-hidden rounded-[34px] border border-emerald-100 bg-white shadow-xl shadow-emerald-100/50">
            <div className="bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 p-7 text-white lg:p-9">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/15 text-3xl">✓</div>
              <p className="mt-6 text-[11px] font-black uppercase tracking-[.22em] text-emerald-100">Status da consulta</p>
              <h1 className="mt-2 text-4xl font-black tracking-[-.045em]">Certificado localizado.</h1>
              <p className="mt-4 text-sm leading-relaxed text-emerald-50">Os dados apresentados correspondem ao identificador consultado no ambiente demonstrativo do UVERGS 360.</p>
            </div>
            <div className="p-6 lg:p-8">
              <div className="rounded-2xl bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Código verificado</p><p className="mt-2 break-all font-mono text-sm font-black text-emerald-950">CERT-U360-2026-00142</p></div>
              <div className="mt-4 rounded-2xl border border-slate-200 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Integridade demonstrativa</p><p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-slate-600">sha256:7f23a91b0e84c6d9f142360a8c4e1d02cfd142006d1b6232a8aef72b604c9142</p></div>
              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><b>Ambiente demonstrativo:</b> esta consulta simula como funcionará a validação pública. O certificado exibido não possui validade oficial.</div>
            </div>
          </article>

          <section className="rounded-[34px] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/40 lg:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Dados certificados</p><h2 className="mt-2 text-3xl font-black tracking-tight">Ana Martins</h2><p className="mt-1 text-sm text-slate-500">Câmara Municipal de Santo Ângelo</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">✓ verificado</span></div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[["Evento","Inteligência Artificial na Gestão Pública"],["Data","24 de setembro de 2026"],["Local","Porto Alegre/RS"],["Carga horária","8 horas"],["Emissor","UVERGS"],["Emissão","24/09/2026 • 17:12"]].map(([a,b])=><div key={a} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{a}</p><p className="mt-2 text-sm font-black text-slate-800">{b}</p></div>)}
            </div>

            <div className="mt-7"><p className="text-[11px] font-black uppercase tracking-[.2em] text-violet-600">Evidência de presença</p><h3 className="mt-2 text-2xl font-black">Checkpoints vinculados</h3></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              {checkpoints.map(([hora,tipo,origem,status],i)=><div key={`${hora}-${tipo}`} className={`grid gap-2 px-5 py-4 sm:grid-cols-[70px_1fr_1fr_.7fr] sm:items-center ${i<checkpoints.length-1?"border-b border-slate-100":""}`}><b className="text-xs text-slate-600">{hora}</b><span className="text-xs font-black text-slate-800">{tipo}</span><span className="text-xs text-slate-500">{origem}</span><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">{status}</span></div>)}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">{[["1","presença validada"],["2","regra de carga horária"],["3","certificado emitido"]].map(([n,t])=><div key={n} className="rounded-2xl bg-blue-50 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">{n}</span><p className="mt-3 text-xs font-black text-blue-950">{t}</p></div>)}</div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/portal/vereador/certificados/ia-gestao-publica" className="rounded-2xl bg-blue-700 px-5 py-3.5 text-center text-sm font-black text-white">Ver certificado demonstrativo</Link><Link href="/eventos/ia-gestao-publica" className="rounded-2xl border border-slate-200 px-5 py-3.5 text-center text-sm font-black text-slate-600">Ver evento</Link></div>
          </section>
        </section>

        <section className="mt-6 rounded-[30px] bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-200">Em produção</p><h2 className="mt-2 text-3xl font-black">Verificação simples para qualquer Câmara, órgão ou cidadão.</h2><p className="mt-3 max-w-4xl text-sm leading-relaxed text-blue-100">A consulta pública deve validar identificador único, status de emissão/revogação, integridade do documento e os dados mínimos definidos pela UVERGS, sem expor informações pessoais além do necessário.</p></section>
      </main>
    </div>
  );
}
