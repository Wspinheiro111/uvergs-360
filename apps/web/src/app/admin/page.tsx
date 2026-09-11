import Link from "next/link";

import { loadAdminOverview } from "@/lib/admin-data";

import { DataNotice } from "./_components/DataNotice";

interface ModuleCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  badge: string;
  external?: boolean;
}

function ModuleCard({ title, description, href, icon, badge, external }: ModuleCardProps) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="block rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-3xl" aria-hidden="true">{icon}</span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{badge}</span>
      </div>
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
    </Link>
  );
}

export default async function AdminPage() {
  const result = await loadAdminOverview();
  const overview = result.data;
  const cards: ModuleCardProps[] = [
    {
      title: "Feature flags",
      description: "Consulte o estado real das funcionalidades e suas aprovações.",
      href: "/admin/flags",
      icon: "🚩",
      badge: overview ? `${overview.enabledFlags}/${overview.totalFlags} ativas` : "Consultar",
    },
    {
      title: "Usuários e perfis",
      description: "Consulte contas, perfis atribuídos, status e configuração de segurança.",
      href: "/admin/users",
      icon: "👥",
      badge: overview ? `${overview.activeUsers}/${overview.users} ativos` : "Consultar",
    },
    {
      title: "Auditoria",
      description: "Pesquise ações críticas por módulo, resultado, usuário ou e-mail.",
      href: "/admin/audit",
      icon: "📋",
      badge: overview ? `${overview.auditEvents24h} nas últimas 24h` : "Consultar",
    },
    {
      title: "Saúde dos serviços",
      description: "Verifique banco, cache e armazenamento usados pelo ambiente atual.",
      href: "/api/health",
      icon: "💚",
      badge: "Verificar agora",
      external: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Visão operacional</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Painel administrativo</h1>
        <p className="mt-2 text-sm text-slate-500">Dados do tenant autenticado, atualizados a cada acesso.</p>
      </div>

      {result.error && <div className="mb-6"><DataNotice message={result.error} /></div>}

      <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="font-semibold text-emerald-900">Núcleo administrativo disponível</p>
        <p className="mt-1 text-sm text-emerald-800">
          Usuários, auditoria e feature flags já usam dados reais. Operações de alteração sensíveis continuam protegidas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((card) => <ModuleCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
