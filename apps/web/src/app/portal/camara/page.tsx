import Link from "next/link";

const vereadores = [
  { nome: "Ana Martins", cargo: "Vereadora", status: "Engajada", ultimo: "4 dias", score: 91 },
  { nome: "Carlos Ribeiro", cargo: "Vereador", status: "Ativo", ultimo: "12 dias", score: 78 },
  { nome: "Marina Lopes", cargo: "Vereadora", status: "Reativar", ultimo: "94 dias", score: 54 },
  { nome: "João Becker", cargo: "Vereador", status: "Novo", ultimo: "Sem histórico", score: 42 },
];

const tarefas = [
  ["Atualizar telefones institucionais", "2 contatos incompletos", "Alta"],
  ["Confirmar composição da Mesa Diretora", "dados de 2026", "Média"],
  ["Revisar e-mails dos vereadores", "1 endereço inválido", "Alta"],
];

export default function PortalCamaraPage() {
  return (
    <div className="min-h-screen bg-[#f6f9fe] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1450px] items-center gap-4 px-5 py-4 lg:px-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-blue-500 text-sm font-black text-white shadow-lg shadow-blue-200">C</div>
          <div className="flex-1"><p className="text-sm font-black text-blue-950">Portal da Câmara</p><p className="text-[11px] text-slate-500">Câmara Municipal de Santo Ângelo • UVERGS 360</p></div>
          <span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 sm:inline-flex">Ambiente demonstrativo</span>
          <Link href="/admin/growth/presentation" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Visão da diretoria</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1450px] px-5 py-8 lg:px-10 lg:py-12">
        <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <article className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700 p-7 text-white shadow-2xl shadow-blue-200/50 lg:p-10">
            <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[44px] border-white/10" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[.22em] text-blue-200">Relacionamento institucional</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.04em] lg:text-6xl">A Câmara conectada à UVERGS.</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100">Um espaço simples para manter dados institucionais atualizados, acompanhar vereadores vinculados e acessar eventos e serviços da UVERGS.</p>
              <div className="mt-7 flex flex-wrap gap-3"><button className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-900">Atualizar dados da Câmara</button><button className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white">Convidar responsável</button></div>
            </div>
          </article>

          <article className="rounded-[36px] border border-slate-200 bg-white p-7 shadow-sm lg:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Qualidade cadastral</p><h2 className="mt-2 text-3xl font-black">88% completo</h2></div><div className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-blue-100 border-t-blue-700 text-lg font-black text-blue-700">88%</div></div>
            <p className="mt-5 text-sm leading-relaxed text-slate-500">Dados atualizados ajudam a UVERGS a manter a comunicação correta com a Câmara e seus vereadores.</p>
            <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Vereadores</p><p className="mt-2 text-2xl font-black text-blue-950">11</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Contatos válidos</p><p className="mt-2 text-2xl font-black text-emerald-900">9</p></div></div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_.72fr]">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Vereadores vinculados</p><h2 className="mt-2 text-2xl font-black">Relacionamento da Câmara</h2></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">11 no mandato atual</span></div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[1.3fr_.7fr_.5fr_.4fr] gap-3 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 md:grid"><span>Vereador</span><span>Relacionamento</span><span>Última interação</span><span>Score</span></div>
              {vereadores.map((v,i)=><div key={v.nome} className={`grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_.7fr_.5fr_.4fr] md:items-center ${i<vereadores.length-1?"border-b border-slate-100":""}`}><div><p className="text-sm font-black text-slate-800">{v.nome}</p><p className="mt-1 text-xs text-slate-400">{v.cargo}</p></div><div><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${v.status==="Engajada"?"bg-emerald-50 text-emerald-700":v.status==="Reativar"?"bg-amber-50 text-amber-700":v.status==="Novo"?"bg-cyan-50 text-cyan-700":"bg-blue-50 text-blue-700"}`}>{v.status}</span></div><p className="text-xs font-semibold text-slate-500">{v.ultimo}</p><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${v.score}%`}}/></div><b className="text-xs text-blue-700">{v.score}</b></div></div>)}
            </div>
            <p className="mt-4 text-xs text-slate-400">Demonstração com perfis sintéticos. O vínculo real deve preservar histórico de mandatos e mudanças de Câmara.</p>
          </article>

          <article className="rounded-[30px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-amber-700">Pendências da Câmara</p><h2 className="mt-2 text-2xl font-black">3 ações melhoram sua base agora</h2><div className="mt-6 space-y-3">{tarefas.map(([titulo,nota,nivel])=><div key={titulo} className="rounded-2xl border border-amber-100 bg-white p-4"><div className="flex items-start gap-3"><div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${nivel==="Alta"?"bg-rose-500":"bg-amber-400"}`}/><div className="flex-1"><p className="text-sm font-black text-slate-800">{titulo}</p><p className="mt-1 text-xs text-slate-400">{nota}</p></div><span className="text-[9px] font-black uppercase text-amber-700">{nivel}</span></div></div>)}</div><button className="mt-6 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-amber-950">Revisar dados institucionais</button></article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-xl">📅</div><p className="mt-5 text-[10px] font-black uppercase tracking-widest text-blue-600">Próximo evento</p><h3 className="mt-2 text-xl font-black">IA na Gestão Pública</h3><p className="mt-2 text-sm text-slate-500">24/09 • Porto Alegre</p><div className="mt-5 rounded-2xl bg-blue-50 p-4"><p className="text-xs text-blue-700"><b>4 vereadores</b> desta Câmara têm alta afinidade com o tema.</p></div></article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-xl">📈</div><p className="mt-5 text-[10px] font-black uppercase tracking-widest text-emerald-700">Participação</p><h3 className="mt-2 text-xl font-black">7 presenças em 2026</h3><p className="mt-2 text-sm text-slate-500">3 vereadores participaram de atividades da UVERGS neste ano.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-[64%] rounded-full bg-emerald-500"/></div></article>
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-xl">🤝</div><p className="mt-5 text-[10px] font-black uppercase tracking-widest text-cyan-700">Relacionamento UVERGS</p><h3 className="mt-2 text-xl font-black">Nível: Forte</h3><p className="mt-2 text-sm text-slate-500">Contato institucional atualizado e presença recente em eventos.</p><div className="mt-5 flex gap-2"><span className="rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-bold text-cyan-700">Dados atualizados</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Ativa</span></div></article>
        </section>

        <section className="mt-6 rounded-[30px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-7 lg:p-9"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Canal institucional</p><h2 className="mt-2 text-2xl font-black lg:text-3xl">A Câmara ajuda a manter a rede UVERGS atualizada.</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">A proposta é transformar a Câmara em parceira da qualidade cadastral, sem dar acesso ao CRM global da UVERGS. Cada instituição visualiza apenas seus próprios dados e vínculos autorizados.</p></div><Link href="/portal/vereador" className="rounded-2xl bg-blue-700 px-5 py-3 text-center text-sm font-black text-white shadow-lg shadow-blue-100">Ver Meu UVERGS →</Link></div></section>

        <footer className="mt-10 border-t border-slate-200 py-6 text-xs text-slate-400">UVERGS 360 • Portal da Câmara • Demonstração com dados sintéticos e acesso restrito por escopo institucional</footer>
      </main>
    </div>
  );
}
