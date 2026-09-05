"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Início", icon: "🏠" },
  { href: "/admin/flags", label: "Feature Flags", icon: "🚩" },
  { href: "/admin/users", label: "Usuários", icon: "👥" },
  { href: "/admin/audit", label: "Auditoria", icon: "📋" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1a3a6e] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-blue-800">
          <p className="text-xs font-bold tracking-widest text-blue-300 uppercase">
            UVERGS 360
          </p>
          <p className="text-xs text-blue-400 mt-0.5">Gestão Institucional</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-white/15 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-800">
          <p className="text-xs text-blue-400">W9 Sistemas · v0.1.0-F0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-sm text-slate-600">Administrador</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
