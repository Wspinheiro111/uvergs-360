"use client";

import Link from "next/link";

export default function CertificadoEventoPage() {
  return <div className="min-h-screen bg-[#eef6ff] text-slate-950 print:bg-white">
    <header className="border-b border-blue-100 bg-white/90 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-5 lg:px-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 font-black text-white">U</div>
        <div className="flex-1"><p className="text-sm font-black text-blue-950">Meu UVERGS</p><p className="text-[10px] text-slate-400">Certificados digitais</p></div>
        <Link href="/portal/vereador" className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Voltar</Link>
      </div>
    </header>

    <main className="mx-auto max-w-[1400px] px-5 py-10 lg:px-10 lg:py-14 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700">✓ Presença confirmada</span><h1 className="mt-3 text-4xl font-black tracking-tight">Certificado liberado automaticamente.</h1><p className="mt-2 text-sm text-slate-500">O certificado encerra a operação do evento — e a avaliação inicia o próximo relacionamento.</p></div>
        <div className="flex flex-wrap gap-3"><Link href="/portal/vereador/avaliacao/ia-gestao-publica" className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100">Avaliar evento</Link><Link href="/certificados/verificar/CERT-U360-2026-00142" className="rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700">Verificar autenticidade</Link><button onClick={()=>window.print()} className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100">Imprimir / salvar em PDF</button></div>
      </div>

      <section className="relative overflow-hidden rounded-[34px] border-[10px] border-white bg-white shadow-2xl shadow-blue-200/60 print:rounded-none print:border-0 print:shadow-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(59,130,246,.10),transparent_26%),radial-gradient(circle_at_88%_84%,rgba(16,185,129,.09),transparent_22%)]" />
        <div className="absolute left-8 top-8 text-[120px] font-black tracking-tight text-blue-950/[.025] lg:text-[190px]">UVERGS</div>
        <div className="relative min-h-[760px] border border-blue-100 p-8 sm:p-12 lg:p-16 print:min-h-0 print:p-12">
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-800 to-cyan-500 text-xl font-black text-white">U</div><div><p className="text-xs font-black uppercase tracking-[.28em] text-blue-800">UVERGS 360</p><p className="mt-1 text-xs text-slate-400">Certificação digital</p></div></div>
            <div className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-700">Demonstração • sem validade</div>
          </div>

          <div className="mx-auto mt-20 max-w-5xl text-center">
            <p className="text-xs font-black uppercase tracking-[.35em] text-blue-600">Certificado de participação</p>
            <h2 className="mt-8 text-3xl font-semibold leading-relaxed text-slate-700 sm:text-4xl">Certificamos que</h2>
            <p className="mt-4 text-5xl font-black tracking-[-.045em] text-blue-950 sm:text-6xl lg:text-7xl">Ana Martins</p>
            <p className="mx-auto mt-8 max-w-4xl text-lg leading-relaxed text-slate-600">participou do evento <b className="text-slate-900">Inteligência Artificial na Gestão Pública</b>, realizado em Porto Alegre/RS, com carga horária demonstrativa de <b className="text-slate-900">8 horas</b>.</p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-3">
            <div className="rounded-2xl bg-blue-50 p-5 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Evento</p><p className="mt-2 text-sm font-black text-blue-950">IA na Gestão Pública</p></div>
            <div className="rounded-2xl bg-emerald-50 p-5 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Presença</p><p className="mt-2 text-sm font-black text-emerald-950">Confirmada por check-in</p></div>
            <div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Código</p><p className="mt-2 text-sm font-black text-slate-800">CERT-U360-2026-00142</p></div>
          </div>

          <div className="mx-auto mt-16 flex max-w-4xl flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-center"><div className="mx-auto h-px w-64 bg-slate-300"/><p className="mt-3 text-sm font-black text-slate-800">UVERGS</p><p className="mt-1 text-[10px] text-slate-400">Emissão institucional demonstrativa</p></div>
            <div className="text-center"><div className="mx-auto h-px w-64 bg-slate-300"/><p className="mt-3 text-sm font-black text-slate-800">24 de setembro de 2026</p><p className="mt-1 text-[10px] text-slate-400">Porto Alegre • Rio Grande do Sul</p></div>
          </div>

          <div className="mt-14 border-t border-slate-100 pt-5 text-center text-[10px] leading-relaxed text-slate-400">Documento demonstrativo do UVERGS 360. Código público de consulta: CERT-U360-2026-00142. Em produção, a verificação deverá refletir o estado real de emissão/revogação e a integridade do documento.</div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-5 print:hidden">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">1. Check-in</p><p className="mt-2 text-sm font-black">Presença confirmada</p></div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">2. Regra</p><p className="mt-2 text-sm font-black">Elegibilidade validada</p></div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5"><p className="text-[10px] font-black uppercase tracking-widest text-blue-500">3. Entrega</p><p className="mt-2 text-sm font-black">Certificado no Meu UVERGS</p></div>
        <Link href="/certificados/verificar/CERT-U360-2026-00142" className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">4. Validação</p><p className="mt-2 text-sm font-black text-emerald-950">Consulta pública →</p></Link>
        <Link href="/portal/vereador/avaliacao/ia-gestao-publica" className="rounded-[24px] border border-violet-100 bg-violet-50 p-5"><p className="text-[10px] font-black uppercase tracking-widest text-violet-600">5. Relacionamento</p><p className="mt-2 text-sm font-black text-violet-950">Avaliar e continuar →</p></Link>
      </section>
    </main>
  </div>;
}
