import Link from "next/link";

// Dashboard principal do admin — Gate F0
export default function AdminPage() {
  const cards = [
    {
      title: "Feature Flags",
      description: "Controle de funcionalidades por tenant. Flags VAL-LEGAL desligadas por padrão.",
      href: "/admin/flags",
      icon: "🚩",
      status: "ok",
      badge: "6 flags ativas",
    },
    {
      title: "Usuários & Roles",
      description: "Gerenciamento de usuários, perfis e permissões. 2FA obrigatório para roles sensíveis.",
      href: "/admin/users",
      icon: "👥",
      status: "f1",
      badge: "Disponível em F1",
    },
    {
      title: "Auditoria",
      description: "Registro append-only de todas as ações críticas. Correlação por requisição.",
      href: "/admin/audit",
      icon: "📋",
      status: "f1",
      badge: "Disponível em F1",
    },
    {
      title: "Health Check",
      description: "Status do banco, Redis e storage em tempo real.",
      href: "/api/health",
      icon: "💚",
      status: "ok",
      badge: "Disponível",
      external: true,
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-800">
          Painel Administrativo
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          UVERGS 360 · Fase F0 — Fundação e Segurança
        </p>
      </div>

      {/* Status Gate F0 */}
      <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
        <span className="text-2xl">🟢</span>
        <div>
          <p className="font-semibold text-green-800">Gate F0: GO (banco + segurança)</p>
          <p className="text-sm text-green-700 mt-0.5">
            53/53 testes passando — Isolamento RLS, Auditoria, Feature Flags, Sessões.
            Pendente: CI/CD GitHub + Deploy Vercel.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            target={card.external ? "_blank" : undefined}
            className={`
              block p-6 bg-white border rounded-xl transition-all
              ${card.status === "ok"
                ? "border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer"
                : "border-slate-100 opacity-60 cursor-not-allowed pointer-events-none"
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{card.icon}</span>
              <span className={`
                text-xs px-2 py-1 rounded-full font-medium
                ${card.status === "ok"
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
                }
              `}>
                {card.badge}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Resumo técnico */}
      <div className="mt-8 p-5 bg-slate-800 rounded-xl text-white">
        <p className="text-xs font-mono text-slate-400 mb-3">STACK TÉCNICA</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            ["Banco", "PostgreSQL 16 + pgvector"],
            ["ORM", "Drizzle ORM 0.38"],
            ["API", "tRPC 11"],
            ["Auth", "Auth.js v5 + TOTP"],
            ["Filas", "BullMQ 5 + Redis 7"],
            ["Email", "Resend"],
            ["Frontend", "Next.js 15 + Tailwind"],
            ["Deploy", "Vercel (staging)"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-slate-100 font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
