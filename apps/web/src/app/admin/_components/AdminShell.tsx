"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "./SignOutButton";

// =============================================================================
// Navegação reorganizada segundo docs/UVERGS_360_PRODUCT_SCOPE_V2.md.
//
// `status: "real"` — a rota existe e lê (ou lê+escreve) dado real do banco.
// `status: "planned"` — o módulo está no escopo definitivo mas ainda não foi
//   construído. Aparece na navegação (arquitetura correta, visível desde já),
//   mas não é um link clicável e nunca deve exibir número ou mock — só o
//   rótulo "Em construção". Isso evita a situação que a auditoria anterior
//   já apontou: um item de menu que parece funcional e não é.
//
// /admin/institucional (CRUD de Câmaras/vereadores/mandatos) continua
// existindo e funcionando — só não está mais no menu principal porque o
// escopo novo pede "Base 360º" como a porta de entrada. Ver
// apps/web/src/app/admin/relacionamento/base-360/page.tsx.
// =============================================================================

type IconName =
  | "home" | "network" | "map" | "profile" | "radar"
  | "segment" | "campaign" | "journey"
  | "events" | "checkin" | "certificate"
  | "portal"
  | "finance"
  | "warehouse"
  | "intelligence"
  | "flags" | "users" | "audit" | "settings";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  status: "real" | "planned";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: "Visão geral", items: [{ href: "/admin", label: "Painel", icon: "home", status: "real" }] },
  {
    label: "Relacionamento",
    items: [
      { href: "/admin/relacionamento/base-360", label: "Base 360º", icon: "network", status: "real" },
      { href: "/admin/relacionamento/radar", label: "Radar UVERGS", icon: "radar", status: "planned" },
      { href: "/admin/relacionamento/perfil", label: "Perfil 360º", icon: "profile", status: "planned" },
      { href: "/admin/relacionamento/territorio", label: "Território RS", icon: "map", status: "planned" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/admin/comunicacao/segmentos", label: "Segmentos", icon: "segment", status: "planned" },
      { href: "/admin/comunicacao", label: "Campanhas", icon: "campaign", status: "real" },
      { href: "/admin/comunicacao/jornadas", label: "Jornadas", icon: "journey", status: "planned" },
    ],
  },
  {
    label: "Eventos",
    items: [
      { href: "/admin/eventos", label: "Eventos", icon: "events", status: "real" },
      { href: "/admin/eventos/inscricoes", label: "Inscrições", icon: "events", status: "planned" },
      { href: "/admin/eventos/checkin", label: "Check-in", icon: "checkin", status: "planned" },
      { href: "/admin/eventos/presenca", label: "Evento 360 / Presença", icon: "checkin", status: "planned" },
      { href: "/admin/eventos/certificados", label: "Certificados", icon: "certificate", status: "planned" },
      { href: "/admin/eventos/pos-evento", label: "Pós-evento", icon: "certificate", status: "planned" },
    ],
  },
  {
    label: "Portais",
    items: [
      { href: "/portal/vereador", label: "Meu UVERGS", icon: "portal", status: "planned" },
      { href: "/portal/camara", label: "Portal da Câmara", icon: "portal", status: "planned" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/admin/financeiro?view=overview", label: "Visão Financeira", icon: "finance", status: "real" },
      { href: "/admin/financeiro?view=pagar", label: "Contas a Pagar", icon: "finance", status: "real" },
      { href: "/admin/financeiro?view=receber", label: "Contas a Receber", icon: "finance", status: "real" },
      { href: "/admin/financeiro?view=relatorios", label: "DRE", icon: "finance", status: "real" },
    ],
  },
  {
    label: "Almoxarifado",
    items: [
      { href: "/admin/almoxarifado/estoque", label: "Estoque", icon: "warehouse", status: "planned" },
      { href: "/admin/almoxarifado/produtos", label: "Produtos/Materiais", icon: "warehouse", status: "planned" },
      { href: "/admin/almoxarifado/pedidos", label: "Pedidos", icon: "warehouse", status: "planned" },
      { href: "/admin/almoxarifado/movimentacoes", label: "Movimentações", icon: "warehouse", status: "planned" },
      { href: "/admin/almoxarifado/reservas", label: "Reservas por Evento", icon: "warehouse", status: "planned" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/admin/inteligencia/metas", label: "Metas & Impacto", icon: "intelligence", status: "planned" },
      { href: "/admin/inteligencia/conversao", label: "Conversão", icon: "intelligence", status: "planned" },
      { href: "/admin/inteligencia/regioes", label: "Regiões", icon: "intelligence", status: "planned" },
      { href: "/admin/inteligencia/recorrencia", label: "Recorrência", icon: "intelligence", status: "planned" },
      { href: "/admin/inteligencia/relatorios", label: "Relatórios", icon: "intelligence", status: "planned" },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/admin/users", label: "Usuários e Permissões", icon: "users", status: "real" },
      { href: "/admin/audit", label: "Auditoria", icon: "audit", status: "real" },
      { href: "/admin/configuracoes", label: "Configurações", icon: "settings", status: "planned" },
      { href: "/admin/flags", label: "Feature flags", icon: "flags", status: "real" },
    ],
  },
];

interface AdminShellProps {
  children: React.ReactNode;
  displayName: string;
  email?: string;
}

function isActiveRoute(pathname: string, href: string) {
  const [path] = href.split("?");
  return pathname === path || (path !== "/admin" && pathname.startsWith(path ?? href));
}

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    network: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><path d="m9.5 9.5 5 5M17 3v7M3 17h7" /></>,
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M21 12h-2M5 12H3" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
    map: <><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>,
    segment: <><circle cx="6" cy="7" r="3" /><circle cx="18" cy="7" r="3" /><circle cx="12" cy="17" r="3" /></>,
    campaign: <><path d="M4 5h16v12H8l-4 4V5Z" /><path d="M8 9h8M8 13h5" /></>,
    journey: <><path d="M4 12h4l2-6 4 12 2-6h4" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 15 2 2 4-4" /></>,
    checkin: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="m15 17 2 2 4-4" /></>,
    certificate: <><circle cx="12" cy="9" r="6" /><path d="m9 14-2 7 5-3 5 3-2-7" /></>,
    portal: <><rect x="4" y="10" width="16" height="11" rx="1" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /></>,
    finance: <><circle cx="12" cy="12" r="9" /><path d="M16 8.5c-.8-.8-2-1.2-3.5-1.2-2 0-3.5 1-3.5 2.5s1.2 2.2 3.4 2.6c2.3.4 3.6 1.1 3.6 2.6s-1.5 2.5-3.7 2.5c-1.6 0-3-.5-4-1.5M12 5v14" /></>,
    warehouse: <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-8h6v8" /></>,
    intelligence: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    flags: <><path d="M5 21V4" /><path d="M5 5h11l-2 4 2 4H5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    audit: <><path d="M9 11h6M9 15h6M9 7h3" /><path d="M5 3h14v18H5z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  if (item.status === "planned") {
    return (
      <span
        title="Módulo do escopo definitivo, ainda não construído"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-100/35"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-blue-200/40"><NavIcon name={item.icon} /></span>
        <span className="flex-1">{item.label}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-200/50">Em construção</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-white text-[#0b3567] shadow-lg shadow-blue-950/20" : "text-blue-100/80 hover:bg-white/10 hover:text-white"}`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${active ? "bg-blue-50 text-blue-700" : "bg-white/10 text-blue-200"}`}><NavIcon name={item.icon} /></span>
      <span className="flex-1">{item.label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
    </Link>
  );
}

export function AdminShell({ children, displayName, email }: AdminShellProps) {
  const pathname = usePathname();
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const realItems = NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.status === "real");

  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:flex">
      <aside className="relative z-20 flex bg-[#082b59] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:flex-col lg:shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-6">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-[#0a3c76] shadow-lg shadow-blue-950/25">
            <span className="text-lg font-black tracking-[-0.1em]">U<span className="text-amber-500">.</span></span>
            <span className="absolute bottom-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-[0.16em]">UVERGS 360</p>
            <p className="mt-0.5 truncate text-[11px] text-blue-200/75">Relacionamento Institucional</p>
          </div>
        </div>

        <nav aria-label="Navegação administrativa" className="hidden flex-1 overflow-y-auto px-4 pb-4 lg:block">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mt-5 first:mt-2">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/55">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActiveRoute(pathname, item.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden p-4 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-100"><span className="status-dot bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />Linha de consolidação</div>
            <p className="mt-2 text-[10px] leading-4 text-blue-200/55">Arquitetura oficial · escopo v2 · dados reais</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto px-2 lg:hidden">
          {realItems.map((item) => (
            <Link key={item.href} href={item.href} aria-label={item.label} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isActiveRoute(pathname, item.href) ? "bg-white text-blue-800" : "text-blue-100"}`}>
              <NavIcon name={item.icon} />
            </Link>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex min-h-[68px] items-center border-b border-white/80 bg-white/80 px-4 backdrop-blur-xl sm:px-7">
          <div className="hidden flex-1 sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Central de gestão</p>
            <p className="mt-0.5 text-xs text-slate-400">UVERGS · Rio Grande do Sul</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-800 to-cyan-600 text-xs font-bold text-white shadow-md shadow-blue-900/15">{initial}</div>
            <div className="hidden leading-tight sm:block">
              <p className="max-w-44 truncate text-sm font-medium text-slate-800">{displayName}</p>
              {email && <p className="mt-0.5 max-w-44 truncate text-[11px] text-slate-400">{email}</p>}
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="min-h-[calc(100vh-68px)]">{children}</main>
      </div>
    </div>
  );
}
