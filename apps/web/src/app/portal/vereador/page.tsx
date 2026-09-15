import Link from "next/link";

const eventos = [
  { titulo: "Inteligência Artificial na Gestão Pública", data: "24 SET", local: "Porto Alegre", afinidade: "96%", status: "Recomendado" },
  { titulo: "Comunicação Pública e Mandato", data: "17 OUT", local: "Santa Maria", afinidade: "88%", status: "Vagas abertas" },
  { titulo: "Gestão Municipal 360", data: "06 NOV", local: "Passo Fundo", afinidade: "81%", status: "Em breve" },
];

const historico = [
  ["12 set", "Você demonstrou interesse em IA e Gestão Pública", "Interesse"],
  ["03 ago", "Certificado emitido — Encontro Regional das Missões", "Certificado"],
  ["02 ago", "Presença confirmada no Encontro Regional das Missões", "Evento"],
  ["15 jul", "Perfil institucional atualizado", "Perfil"],
];

export default function MeuUvergsPage() {
  return (
    <div className="min-h-screen bg-[#f5f9ff] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1450px] items-center gap-4 px-5 py-4 lg:px-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-sm font-black text-white shadow-lg shadow-blue-200">U</div>
          <div className="flex-1">
            <p className="text-sm font-black tracking-tight text-blue-950">Meu UVERGS</p>
            <p className="text-[11px] text-slate-500">Seu relacionamento com a UVERGS em um só lugar</p>
          </div>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 sm:inline-flex">Demonstração</span>
          <Link href="/admin/growth/presentation" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Visão da diretoria</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1450px] px-5 py-8 lg:px-10 lg:py-12">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-blue-800 via-blue-700 to-cyan-500 p-7 text-white shadow-2xl shadow-blue-200/60 lg:p-10">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[48px] border-white/10" />
          <div className="absolute bottom-0 right-48 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-blue-100">Olá, Ana 👋</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-.04em] lg:text-6xl">Seu mandato mais conectado à UVERGS.</h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-blue-100 lg:text-lg">Eventos, certificados, conteúdos, histórico e oportunidades recomendadas de acordo com seus interesses.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#eventos" className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-blue-800 shadow-lg">Ver próximos eventos</a>
                <a href="#perfil" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">Atualizar meus interesses</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["91","afinidade UVERGS"],["4","eventos no histórico"],["3","certificados"],["82%","perfil completo"]].map(([v,l])=><div key={l} className="rounded-[26px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl"><p className="text-3xl font-black">{v}</p><p className="mt-2 text-xs leading-relaxed text-blue-100">{l}</p></div>)}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <article className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Próxima melhor oportunidade</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">Inteligência Artificial na Gestão Pública</h2><p className="mt-2 text-sm text-slate-500">24 de setembro • Porto Alegre • 96% de afinidade com seus interesses</p></div>
              <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">96% compatível</span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Tema</p><p className="mt-2 font-bold text-blue-950">IA + Gestão Pública</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Situação</p><p className="mt-2 font-bold text-slate-800">Inscrição iniciada</p></div>
              <div className="rounded-2xl bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Prazo</p><p className="mt-2 font-bold text-amber-900">Concluir esta semana</p></div>
            </div>
            <button className="mt-6 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100">Continuar minha inscrição →</button>
          </article>

          <article id="perfil" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-slate-400">Meu perfil</p><h2 className="mt-2 text-xl font-black">82% completo</h2></div><div className="flex h-16 w-16 items-center justify-center rounded-full border-[7px] border-blue-100 border-t-blue-600 text-sm font-black text-blue-700">82%</div></div>
            <p className="mt-5 text-sm leading-relaxed text-slate-500">Quanto melhor seu perfil, mais relevantes ficam os eventos, conteúdos e comunicações recomendados.</p>
            <div className="mt-5 flex flex-wrap gap-2">{["IA","Gestão pública","Comunicação","Liderança"].map((tag)=><span key={tag} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{tag}</span>)}</div>
            <button className="mt-6 w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm font-bold text-blue-700">Revisar meus dados</button>
          </article>
        </section>

        <section id="eventos" className="mt-6 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Agenda recomendada</p><h2 className="mt-2 text-3xl font-black tracking-tight">Eventos que combinam com você</h2></div><span className="text-xs font-semibold text-slate-400">Sugestões demonstrativas</span></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">{eventos.map((evento)=><article key={evento.titulo} className="group rounded-[26px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"><div className="flex items-start justify-between gap-3"><div className="rounded-2xl bg-blue-700 px-3 py-2 text-center text-white"><p className="text-xs font-black">{evento.data.split(" ")[0]}</p><p className="text-[10px] font-bold">{evento.data.split(" ")[1]}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{evento.afinidade}</span></div><h3 className="mt-5 text-lg font-black leading-tight">{evento.titulo}</h3><p className="mt-2 text-sm text-slate-500">{evento.local}</p><div className="mt-5 flex items-center justify-between"><span className="text-xs font-bold text-blue-600">{evento.status}</span><span className="text-blue-500 transition group-hover:translate-x-1">→</span></div></article>)}</div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_.7fr]">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-blue-600">Linha do tempo</p><h2 className="mt-2 text-2xl font-black">Meu relacionamento com a UVERGS</h2><div className="mt-6 space-y-5">{historico.map(([data,texto,tipo],i)=><div key={data+texto} className="flex gap-4"><div className="flex flex-col items-center"><span className={`h-3 w-3 rounded-full ${i===0?"bg-blue-600":"bg-slate-300"}`}/>{i<historico.length-1&&<span className="mt-1 h-full w-px bg-slate-200"/>}</div><div className="pb-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-800">{texto}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">{tipo}</span></div><p className="mt-1 text-xs text-slate-400">{data}</p></div></div>)}</div></article>
          <article className="rounded-[30px] bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 ring-1 ring-emerald-100 lg:p-8"><p className="text-[11px] font-black uppercase tracking-[.2em] text-emerald-700">Meus certificados</p><h2 className="mt-2 text-2xl font-black">Tudo guardado em um só lugar.</h2><p className="mt-3 text-sm leading-relaxed text-slate-500">Acesse certificados emitidos pela UVERGS e seu histórico de participação sem precisar procurar e-mails antigos.</p><div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl">🎓</div><div className="flex-1"><p className="text-sm font-black">Encontro Regional das Missões</p><p className="mt-1 text-xs text-slate-400">Emitido em 03/08/2026</p></div><button className="text-sm font-black text-emerald-700">Abrir</button></div></div></article>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>UVERGS 360 • Meu UVERGS • Demonstração com dados sintéticos</span><Link href="/portal/camara" className="font-bold text-blue-600">Conhecer Portal da Câmara →</Link></footer>
      </main>
    </div>
  );
}
