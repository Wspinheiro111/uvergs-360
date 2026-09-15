import Link from "next/link";

const pilares = [
  ["01", "Encontrar", "Mapear vereadores, Câmaras e lacunas de relacionamento."],
  ["02", "Entender", "Ler interesse, engajamento, histórico e oportunidade."],
  ["03", "Comunicar", "Usar campanhas segmentadas e o canal certo para cada perfil."],
  ["04", "Converter", "Transformar interesse em inscrição, presença e recorrência."],
];

const ciclo = [
  { numero: "01", titulo: "Campanha", texto: "Selecionar o público certo e ativar os melhores canais.", href: "/admin/growth/campaigns", acao: "Abrir Campanhas", cor: "blue" },
  { numero: "02", titulo: "Jornada", texto: "Continuar o relacionamento conforme comportamento e intenção.", href: "/admin/growth/journeys", acao: "Abrir Jornadas", cor: "indigo" },
  { numero: "03", titulo: "Landing", texto: "Levar o vereador a uma página clara, contextual e mensurável.", href: "/eventos/ia-gestao-publica", acao: "Abrir Landing", cor: "cyan" },
  { numero: "04", titulo: "Evento 360", texto: "Medir inscrição, presença, origem, região e resultado.", href: "/admin/growth/events", acao: "Abrir Evento 360", cor: "emerald" },
];

export default function PresentationModePage() {
  return (
    <div className="min-h-screen bg-[#f4f8ff] text-slate-950">
      <section className="relative flex min-h-[88vh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,.24),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(16,185,129,.18),transparent_25%),linear-gradient(135deg,#f8fbff_0%,#edf6ff_50%,#f2fff9_100%)]" />
        <div className="absolute -right-24 top-24 h-[520px] w-[520px] rounded-full border-[70px] border-blue-200/35" />
        <div className="absolute right-24 top-56 h-[280px] w-[280px] rounded-full border-[38px] border-emerald-200/50" />
        <div className="relative mx-auto grid max-w-[1500px] items-center gap-12 px-8 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-700 shadow-sm">UVERGS 360 · Visão de futuro</div>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[.95] tracking-[-.045em] lg:text-7xl">Uma UVERGS mais próxima de cada vereador do Rio Grande do Sul.</h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-slate-600">Uma plataforma para conectar dados, relacionamento, comunicação e eventos em uma única visão executiva.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/admin/growth" className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200">Abrir Radar</Link>
              <Link href="/admin/growth/territory" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800">Ver território</Link>
              <Link href="/admin/growth/events" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800">Ver resultado do evento</Link>
            </div>
          </div>
          <div className="grid rotate-[-2deg] grid-cols-2 gap-4">
            {[["5.000", "vereadores na visão de relacionamento"], ["497", "municípios no mapa territorial"], ["360º", "perfil e histórico de cada contato"], ["1", "ciclo completo de crescimento"]].map(([valor, legenda], i) => (
              <div key={legenda} className={`rounded-[32px] border p-6 shadow-xl ${i === 0 ? "border-blue-600 bg-blue-700 text-white" : i === 3 ? "border-emerald-400 bg-emerald-500 text-white" : "border-white bg-white"}`}>
                <p className="text-4xl font-black lg:text-5xl">{valor}</p>
                <p className={`mt-3 text-sm leading-relaxed ${i === 0 || i === 3 ? "text-white/80" : "text-slate-500"}`}>{legenda}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-8 py-16 lg:px-14">
        <div className="grid gap-4 lg:grid-cols-4">
          {pilares.map(([numero, titulo, texto]) => (
            <article key={numero} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
              <span className="text-xs font-black tracking-widest text-blue-500">{numero}</span>
              <h2 className="mt-5 text-2xl font-bold">{titulo}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-8 py-10 lg:px-14">
        <div className="rounded-[40px] bg-[#0b2554] p-8 text-white shadow-2xl shadow-blue-100 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-cyan-300">O ciclo completo</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Da oportunidade ao resultado mensurável.</h2>
              <p className="mt-4 leading-relaxed text-blue-100">A demonstração agora percorre todo o caminho de aquisição e relacionamento sem saltos entre as etapas.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ciclo.map((item) => (
                <Link key={item.numero} href={item.href} className="group rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
                  <div className="flex items-center justify-between"><span className="text-xs font-black text-cyan-300">{item.numero}</span><span className="text-blue-200 transition group-hover:translate-x-1">→</span></div>
                  <h3 className="mt-5 text-xl font-black">{item.titulo}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-blue-100">{item.texto}</p>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-wider text-white">{item.acao}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-8 py-12 lg:px-14">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <article className="relative overflow-hidden rounded-[36px] bg-white p-8 ring-1 ring-slate-200 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">A mudança de lógica</p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight">Sair da lista de contatos e chegar à inteligência de relacionamento.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[["Antes", "Quem podemos convidar?"], ["Depois", "Quem tem maior chance de participar?"], ["Antes", "Mandar para todos"], ["Depois", "Falar com o público certo, do jeito certo"]].map(([fase, frase]) => (
                <div key={fase + frase} className={`rounded-2xl p-5 ${fase === "Depois" ? "bg-blue-50 ring-1 ring-blue-100" : "bg-slate-50"}`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest ${fase === "Depois" ? "text-blue-600" : "text-slate-400"}`}>{fase}</p>
                  <p className="mt-2 font-semibold text-slate-800">{frase}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[36px] border border-emerald-100 bg-gradient-to-br from-emerald-100 via-white to-cyan-100 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Resultado esperado</p>
            <div className="mt-6 space-y-5">
              {[["Mais alcance", "mais vereadores conhecidos e alcançáveis"], ["Mais participação", "mais inscrições e presença nos eventos"], ["Mais recorrência", "mais relacionamento ao longo do mandato"], ["Mais inteligência", "decisões baseadas em dados e comportamento"]].map(([titulo, detalhe]) => (
                <div key={titulo} className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 font-bold text-white">✓</div><div><p className="font-bold text-slate-900">{titulo}</p><p className="mt-1 text-sm text-slate-500">{detalhe}</p></div></div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-8 py-14 lg:px-14">
        <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Três experiências, uma única estratégia</p><h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">Cada público vê apenas o que precisa.</h2><p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-500">A UVERGS mantém a visão global. A Câmara cuida do seu escopo institucional. O vereador acessa sua própria jornada, eventos e certificados.</p></div>
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-[32px] bg-gradient-to-br from-blue-800 to-blue-600 p-7 text-white shadow-xl shadow-blue-100"><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">UVERGS Admin</p><h3 className="mt-3 text-2xl font-black">Visão estadual e inteligência</h3><p className="mt-3 text-sm leading-relaxed text-blue-100">Radar, território, segmentação, campanhas, jornadas, resultados e governança.</p><Link href="/admin/growth" className="mt-6 inline-flex rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-blue-800">Abrir Radar →</Link></article>
          <article className="rounded-[32px] border border-cyan-100 bg-white p-7 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Portal da Câmara</p><h3 className="mt-3 text-2xl font-black">Dados institucionais e vínculos</h3><p className="mt-3 text-sm leading-relaxed text-slate-500">A Câmara mantém seu cadastro, acompanha vereadores vinculados e acessa serviços da UVERGS sem enxergar o CRM global.</p><Link href="/portal/camara" className="mt-6 inline-flex rounded-2xl bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-800">Abrir Portal da Câmara →</Link></article>
          <article className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-7 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-700">Meu UVERGS</p><h3 className="mt-3 text-2xl font-black">A experiência do vereador</h3><p className="mt-3 text-sm leading-relaxed text-slate-500">Eventos recomendados, histórico, certificados, interesses e relacionamento em uma experiência individual.</p><Link href="/portal/vereador" className="mt-6 inline-flex rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white">Abrir Meu UVERGS →</Link></article>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-8 py-16 lg:px-14">
        <div className="rounded-[40px] border border-slate-200 bg-white p-8 text-center shadow-sm lg:p-12">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-blue-700">UVERGS 360</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight lg:text-6xl">Conectar. Conhecer. Atrair. Converter. Manter.</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-500">A tecnologia como ponte entre a UVERGS, as Câmaras Municipais e cada vereador do Rio Grande do Sul.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/admin/growth" className="rounded-2xl bg-slate-950 px-6 py-3.5 font-semibold text-white">Entrar na experiência</Link><Link href="/admin/growth/events" className="rounded-2xl bg-blue-50 px-6 py-3.5 font-semibold text-blue-800">Ver resultado ponta a ponta</Link></div>
        </div>
      </section>
    </div>
  );
}
