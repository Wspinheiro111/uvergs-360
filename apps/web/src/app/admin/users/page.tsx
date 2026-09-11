import { DataNotice } from "../_components/DataNotice";
import { loadUsers, type UserStatus } from "@/lib/admin-data";

const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  locked: "Bloqueado",
  pending_verification: "Pendente",
};

const STATUS_STYLES: Record<UserStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  locked: "bg-red-50 text-red-700",
  pending_verification: "bg-amber-50 text-amber-700",
};

const VALID_STATUSES = new Set<UserStatus>([
  "active",
  "inactive",
  "locked",
  "pending_verification",
]);

interface UsersPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

function normalizeStatus(value?: string): UserStatus | "all" {
  return value && VALID_STATUSES.has(value as UserStatus) ? value as UserStatus : "all";
}

function formatDate(value: Date | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const status = normalizeStatus(params.status);
  const result = await loadUsers(search, status);
  const directory = result.data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-900">Usuários e perfis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de contas, acesso atribuído e situação de segurança.
        </p>
      </div>

      {directory && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Total", directory.totals.all],
            ["Ativos", directory.totals.active],
            ["Pendentes", directory.totals.pending_verification],
            ["Bloqueados", directory.totals.locked],
            ["Inativos", directory.totals.inactive],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <form className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Buscar usuário</span>
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Buscar por nome ou e-mail"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 sm:w-48"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">
          Filtrar
        </button>
      </form>

      {result.error && <DataNotice message={result.error} />}

      {directory && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-5 py-3 font-medium">Perfis</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Segurança</th>
                  <th className="px-5 py-3 font-medium">Último acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directory.users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{user.displayName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {user.roles.length > 0 ? user.roles.map((role) => (
                          <span key={role} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{role}</span>
                        )) : <span className="text-xs text-slate-400">Sem perfil</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[user.status]}`}>
                        {STATUS_LABELS[user.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p>{user.emailVerified ? "E-mail verificado" : "E-mail não verificado"}</p>
                      <p className="mt-1">{user.totpEnabled ? "2FA ativo" : "2FA não configurado"}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">
                      {formatDate(user.lastSuccessfulLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {directory.users.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>
          )}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            Exibindo até 100 registros. Alterações de acesso continuam bloqueadas nesta entrega.
          </div>
        </div>
      )}
    </div>
  );
}
