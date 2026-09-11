import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { AdminShell } from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const roles = (session as typeof session & { roles?: string[] }).roles ?? [];
  const canAccessAdmin = roles.some((role) =>
    ["admin_global", "presidency", "audit_read"].includes(role)
  );

  if (!canAccessAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">Acesso restrito</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Área administrativa</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Seu usuário está autenticado, mas não possui um perfil administrativo autorizado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AdminShell
      displayName={session.user.name ?? "Usuário"}
      email={session.user.email ?? undefined}
    >
      {children}
    </AdminShell>
  );
}
