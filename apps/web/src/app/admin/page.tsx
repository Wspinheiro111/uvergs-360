import Link from "next/link";

import { loadAdminOverview, loadInstitutionalDirectory } from "@/lib/admin-data";

import { DataNotice } from "./_components/DataNotice";

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  badge: string;
  accent: string;
  symbol: string;
  external?: boolean;
}

function ModuleCard({ title, description, href, badge, accent, symbol, external }: ModuleCardProps) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="group relative overflow-hidden rounded-[22px] border border-white bg-white p-5 shadow-[0_16px_45px_-34px_rgba(10,43,89,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-32px_rgba(10,43,89,.45)]">
      <span className={`absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-15 blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg font-semibold text-white shadow-lg ${accent}`}>{symbol}</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{badge}</span>
      </div>
      <div className="relative mt-5">
        <h2 className="font-semibold tracking-[-0.015em] text-slate-950">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
        <p className="mt-4 text-xs font-semibold text-blue-700 transition-transform group-hover:translate-x-1">Acessar módulo →</p>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const [overviewResult, institutionalResult] = await Promise.all([
    loadAdminOverview(),
    loadInstitutionalDirectory("", "all", ""),
  ]);
  const overview = overviewResult.data;
  const institutional = institutionalResult.data;

  const cards: ModuleCardProps[] = [
    {
      title: "Rede institucional",
      description: "Municípios, Câmaras, vínculos e mandatos conectados em uma visão regional.",
      href: "/admin/institucional",
      symbol: "◎",
      badge: institutional ? `${institutional.totals.chambers} Câmaras` : "Novo",
      accent: "bg-gradient-to-br from-blue-700 to-cyan-500",
    },
    {
      title: "Usuários e perfis",
      description: "Contas, perfis atribuídos, status de acesso e sinais de segurança.",
      href: "/admin/users",
      symbol: "U",
      badge: overview ? `${overview.activeUsers}/${overview.users} ativos` : "Consultar",
      accent: "bg-gradient-to-br from-violet-600 to-fuchsia-500",
    },
    {
      title: "Governança de recursos",
      description: "Funcionalidades protegidas por critérios operacionais e validação jurídica.",
      href: "/admin/flags",
      symbol: "F",
      badge: overview ? `${overview.enabledFlags}/${overview.totalFlags} ativas` : "Consultar",
      accent: "bg-gradient-to-br from-amber-500 to-orange-500",
    },
    {
      title: "Auditoria imutável",
      description: "Rastreabilidade das ações críticas com filtros e correlação por operação.",
      href: "/admin/audit",
      symbol: "A",
      badge: overview ? `${overview.auditEvents24h} hoje` : "Consultar",
      accent: "bg-gradient-to-br from-emerald-600 to-teal-400",
    },
  ];

  return (
    <div className="page-canvas">
      <section className="grid overflow-hidden rounded-[30px] bg-[#092c5c] text-white shadow-[0_28px_80px_-42px_rgba(8,44,92,.9)] xl:grid-cols-[1.35fr_.65fr]">
        <div className="relative px-6 py-8 sm:px-9 sm:py-10">
          <div className="absolute -left-12 top-16 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <span className="eyebrow-light">Centro de inteligência institucional</span>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-[42px]">
              Decisões melhores começam com uma visão completa.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100/80 sm:text-base">
              Conecte pessoas, Câmaras e municípios. Transforme relacionamento institucional em presença, dados e resultados para todo o Rio Grande do Sul.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/admin/institucional" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0a3c76] shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5">Explorar a rede</Link>
              <a href="/api/health" target="_blank" className="rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">Ver saúde do sistema</a>
            </div>
          </div>
        </div>
        <div className="relative hidden min-h-72 overflow-hidden border-l border-white/10 xl:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(51,195,224,.23),transparent_52%)]" />
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30" />
          {["top-[24%] left-[24%]", "top-[33%] right-[18%]", "bottom-[24%] left-[18%]", "bottom-[19%] right-[28%]"].map((position) => <span key={position} className={`absolute ${position} h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_22px_rgba(252,211,77,.8)]`} />)}
          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28px] border border-white/20 bg-white/10 text-xl font-bold backdrop-blur-md">RS</div>
        </div>
      </section>

      {(overviewResult.error || institutionalResult.error) && <div className="mt-6"><DataNotice message={overviewResult.error ?? institutionalResult.error ?? "Dados indisponíveis."} /></div>}

      <section className="mt-7">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><span className="eyebrow">Workspace</span><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-slate-950">Módulos em operação</h2></div>
          <span className="hidden text-xs text-slate-400 sm:block">Dados atualizados a cada acesso</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {cards.map((card) => <ModuleCard key={card.href} {...card} />)}
        </div>
      </section>

      <section className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="surface-panel p-6">
          <div className="flex items-center justify-between"><div><span className="eyebrow">Evolução</span><h2 className="mt-1 text-lg font-semibold text-slate-950">Jornada de implantação</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">F1 em andamento</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[{name:"Fundação",state:"Concluída"},{name:"Institucional",state:"Agora"},{name:"Eventos",state:"Próxima"},{name:"Financeiro",state:"Planejado"}].map((phase, index) => (
              <div key={phase.name} className="relative rounded-2xl bg-slate-50 p-4">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${index < 2 ? "bg-blue-700 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"}`}>{index + 1}</span>
                <p className="mt-3 text-sm font-semibold text-slate-800">{phase.name}</p><p className="mt-1 text-xs text-slate-400">{phase.state}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-amber-300 to-amber-500 p-6 text-[#102d50] shadow-[0_18px_50px_-32px_rgba(180,120,0,.6)]">
          <span className="absolute -right-8 -top-10 text-[120px] font-black text-white/15">360</span>
          <div className="relative"><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Próximo marco</span><h2 className="mt-2 max-w-sm text-xl font-semibold tracking-[-0.02em]">Consolidar a rede das Câmaras municipais.</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#173b63]/80">A base institucional libera eventos, relacionamento, inscrições e inteligência regional.</p></div>
        </div>
      </section>
    </div>
  );
}
