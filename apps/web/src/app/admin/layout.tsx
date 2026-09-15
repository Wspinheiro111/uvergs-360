"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Início", icon: "🏠" },
  { href: "/admin/growth", label: "Radar UVERGS", icon: "📡", exact: true },
  { href: "/admin/growth/territory", label: "Território RS", icon: "🗺️" },
  { href: "/admin/growth/campaigns", label: "Campanhas", icon: "🎯" },
  { href: "/admin/growth/journeys", label: "Jornadas", icon: "⚡" },
  { href: "/admin/growth/events", label: "Evento 360", icon: "📊" },
  { href: "/admin/growth/profile", label: "Perfil 360º", icon: "✨" },
  { href: "/portal/vereador", label: "Meu UVERGS", icon: "🪪", badge: "PORTAL" },
  { href: "/portal/camara", label: "Portal da Câmara", icon: "🏛️", badge: "PORTAL" },
  { href: "/admin/growth/presentation", label: "Modo Apresentação", icon: "▶", badge: "DEMO" },
  { href: "/admin/flags", label: "Feature Flags", icon: "🚩" },
  { href: "/admin/users", label: "Usuários", icon: "👥" },
  { href: "/admin/audit", label: "Auditoria", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-[#f7faff]">
      <aside className="w-64 bg-gradient-to-b from-[#0b2b63] via-[#123f86] to-[#0c326f] text-white flex flex-col shrink-0 shadow-2xl shadow-blue-950/10">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-blue-800 flex items-center justify-center font-black shadow-lg">U</div>
            <div><p className="text-xs font-black tracking-[.22em] text-white uppercase">UVERGS 360</p><p className="text-[11px] text-blue-200 mt-0.5">Relacionamento Institucional</p></div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link key={item.href} href={item.href} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-white text-blue-900 shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${active ? "bg-blue-50" : "bg-white/5 group-hover:bg-white/10"}`}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className={`text-[8px] font-black rounded-full px-2 py-0.5 ${item.badge === "DEMO" ? "bg-emerald-400 text-emerald-950" : "bg-cyan-300 text-cyan-950"}`}>{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-widest text-blue-200">Apresentação diretoria</p>
            <p className="text-xs text-white font-semibold mt-1">Radar + jornada + resultado</p>
          </div>
          <p className="text-[10px] text-blue-300 mt-3">W9 Sistemas · UVERGS 360</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center px-6 shrink-0 sticky top-0 z-30">
          <div className="flex-1"><p className="text-xs font-semibold text-slate-400">UVERGS 360</p><p className="text-sm font-bold text-slate-800">Central de Relacionamento e Crescimento</p></div>
          <div className="flex items-center gap-3">
            <Link href="/admin/growth/presentation" className="hidden md:inline-flex items-center gap-2 rounded-xl bg-blue-50 text-blue-700 px-3 py-2 text-xs font-bold hover:bg-blue-100">▶ Apresentar</Link>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-800 to-cyan-500 flex items-center justify-center shadow-md"><span className="text-white text-xs font-bold">A</span></div>
            <div className="hidden sm:block"><p className="text-sm font-semibold text-slate-700">Administrador</p><p className="text-[10px] text-slate-400">UVERGS</p></div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
