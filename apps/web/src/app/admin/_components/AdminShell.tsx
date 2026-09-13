"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "./SignOutButton";

type IconName = "home" | "network" | "events" | "flags" | "users" | "audit";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: "Visão geral", items: [{ href: "/admin", label: "Painel", icon: "home" }] },
  {
    label: "Negócio",
    items: [
      { href: "/admin/institucional", label: "Rede institucional", icon: "network" },
      { href: "/admin/eventos", label: "Eventos", icon: "events" },
    ],
  },
  {
    label: "Governança",
    items: [
      { href: "/admin/flags", label: "Feature flags", icon: "flags" as IconName },
      { href: "/admin/users", label: "Usuários", icon: "users" as IconName },
      { href: "/admin/audit", label: "Auditoria", icon: "audit" as IconName },
    ],
  },
];

interface AdminShellProps {
  children: React.ReactNode;
  displayName: string;
  email?: string;
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    network: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><path d="m9.5 9.5 5 5M17 3v7M3 17h7" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 15 2 2 4-4" /></>,
    flags: <><path d="M5 21V4" /><path d="M5 5h11l-2 4 2 4H5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    audit: <><path d="M9 11h6M9 15h6M9 7h3" /><path d="M5 3h14v18H5z" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

export function AdminShell({ children, displayName, email }: AdminShellProps) {
  const pathname = usePathname();
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:flex">
      <aside className="relative z-20 flex bg-[#082b59] text-white lg:sticky lg:top-0 lg:h-screen lg:w-[276px] lg:flex-col lg:shrink-0">
        <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-6">
          <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-[#0a3c76] shadow-lg shadow-blue-950/25">
            <span className="text-lg font-black tracking-[-0.1em]">U<span className="text-amber-500">.</span></span>
            <span className="absolute bottom-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-[0.16em]">UVERGS 360</p>
            <p className="mt-0.5 truncate text-[11px] text-blue-200/75">Gestão que aproxima</p>
          </div>
        </div>

        <nav aria-label="Navegação administrativa" className="hidden flex-1 overflow-y-auto px-4 pb-4 lg:block">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mt-5 first:mt-2">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300/55">{group.label}</p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active ? "bg-white text-[#0b3567] shadow-lg shadow-blue-950/20" : "text-blue-100/80 hover:bg-white/10 hover:text-white"}`}>
                      <span className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${active ? "bg-blue-50 text-blue-700" : "bg-white/10 text-blue-200"}`}><NavIcon name={item.icon} /></span>
                      <span className="flex-1">{item.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden p-4 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-100"><span className="status-dot bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" />Preview conectada</div>
            <p className="mt-2 text-[10px] leading-4 text-blue-200/55">Ambiente seguro de homologação · F1</p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1 overflow-x-auto px-2 lg:hidden">
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return <Link key={item.href} href={item.href} aria-label={item.label} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-white text-blue-800" : "text-blue-100"}`}><NavIcon name={item.icon} /></Link>;
          })}
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
