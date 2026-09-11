"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/admin", label: "Início", icon: "🏠" },
  { href: "/admin/flags", label: "Feature Flags", icon: "🚩" },
  { href: "/admin/users", label: "Usuários", icon: "👥" },
  { href: "/admin/audit", label: "Auditoria", icon: "📋" },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
  displayName: string;
  email?: string;
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export function AdminShell({ children, displayName, email }: AdminShellProps) {
  const pathname = usePathname();
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-60 bg-[#1a3a6e] text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-blue-800">
          <p className="text-xs font-bold tracking-widest text-blue-300 uppercase">
            UVERGS 360
          </p>
          <p className="text-xs text-blue-400 mt-0.5">Gestão Institucional</p>
        </div>

        <nav aria-label="Navegação administrativa" className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span aria-hidden="true" className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <p className="text-xs text-blue-400">W9 Sistemas · v0.1.0-F0</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 bg-white border-b border-slate-200 flex items-center px-6 py-2 shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center"
            >
              <span className="text-white text-xs font-bold">{initial}</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm text-slate-700">{displayName}</p>
              {email && <p className="text-xs text-slate-400">{email}</p>}
            </div>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
