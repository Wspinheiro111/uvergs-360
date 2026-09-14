import { DataNotice } from "../_components/DataNotice";
import { loadAuditLogs } from "@/lib/admin-data";

const OUTCOME_LABELS = {
  success: "Sucesso",
  failure: "Falha",
  partial: "Parcial",
} as const;

const OUTCOME_STYLES = {
  success: "bg-emerald-50 text-emerald-700",
  failure: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
} as const;

interface AuditPageProps {
  searchParams: Promise<{ q?: string; module?: string; outcome?: string }>;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const search = params.q?.trim().slice(0, 100) ?? "";
  const module = params.module?.trim().slice(0, 80) ?? "";
  const outcome = params.outcome && params.outcome in OUTCOME_LABELS ? params.outcome : "";
  const result = await loadAuditLogs(search, module, outcome);
  const directory = result.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoria</h1>
          <p className="mt-1 text-sm text-slate-500">Histórico imutável das ações críticas do sistema.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Append-only
        </span>
      </div>

      <form className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_180px_auto]">
        <input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Ação, nome ou e-mail"
          aria-label="Buscar na auditoria"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select name="module" defaultValue={module} aria-label="Filtrar por módulo" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Todos os módulos</option>
          {directory?.modules.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select name="outcome" defaultValue={outcome} aria-label="Filtrar por resultado" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">Todos os resultados</option>
          {Object.entries(OUTCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800">Filtrar</button>
      </form>

      {result.error && <DataNotice message={result.error} />}

      {directory && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Ator</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 font-medium">Entidade</th>
                  <th className="px-5 py-3 font-medium">Resultado</th>
                  <th className="px-5 py-3 font-medium">Correlação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directory.logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{formatDate(log.createdAt)}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{log.userDisplayName ?? "Usuário do sistema"}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{log.userEmail ?? "E-mail não registrado"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-medium text-slate-800">{log.action}</code>
                      <p className="mt-1 text-xs text-slate-500">{log.module}</p>
                      {log.justification && <p className="mt-1 max-w-sm text-xs text-slate-500">{log.justification}</p>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">{log.entityType}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${OUTCOME_STYLES[log.outcome]}`}>
                        {OUTCOME_LABELS[log.outcome]}
                      </span>
                    </td>
                    <td className="px-5 py-4"><code className="text-xs text-slate-500">{log.correlationId.slice(0, 8)}…</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {directory.logs.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nenhum evento encontrado.</p>}
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            Exibindo os 100 eventos mais recentes que atendem aos filtros.
          </div>
        </div>
      )}
    </div>
  );
}
