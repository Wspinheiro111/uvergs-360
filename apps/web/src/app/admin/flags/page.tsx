import { loadFeatureFlags, type FeatureFlagRow } from "@/lib/admin-data";

import { DataNotice } from "../_components/DataNotice";
import { FlagCard } from "./_components/FlagCard";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "./_lib/flag-presentation";

function groupFlags(flags: FeatureFlagRow[]) {
  return flags.reduce<Partial<Record<FeatureFlagRow["category"], FeatureFlagRow[]>>>((groups, flag) => {
    const group = groups[flag.category] ?? [];
    group.push(flag);
    groups[flag.category] = group;
    return groups;
  }, {});
}

export default async function FeatureFlagsPage() {
  const result = await loadFeatureFlags();
  const groupedFlags = groupFlags(result.data ?? []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Feature flags</h1>
          <p className="mt-1 text-sm text-slate-500">Estado real das funcionalidades deste tenant.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Somente leitura
        </span>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Ativação protegida</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          Alterações permanecem bloqueadas até a retomada do segundo fator do aplicativo.
          Flags VAL-LEGAL também exigem aprovação formal documentada.
        </p>
      </div>

      {result.error && <DataNotice message={result.error} />}

      {!result.error && result.data?.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Nenhuma feature flag cadastrada para este tenant.
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const flags = groupedFlags[category];
        if (!flags?.length) return null;
        return (
          <section key={category} className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-slate-500">
              {CATEGORY_LABELS[category]} · {flags.length}
            </h2>
            <div className="space-y-2">
              {flags.map((flag) => <FlagCard key={flag.id} flag={flag} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
