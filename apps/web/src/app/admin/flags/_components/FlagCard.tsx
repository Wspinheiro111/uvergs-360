import type { FeatureFlagRow } from "@/lib/admin-data";

import { CATEGORY_LABELS, CATEGORY_COLORS } from "../_lib/flag-presentation";

interface FlagCardProps {
  flag: FeatureFlagRow;
}

export function FlagCard({ flag }: FlagCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-sm font-mono font-medium text-slate-800">{flag.key}</code>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[flag.category]}`}
          >
            {CATEGORY_LABELS[flag.category]}
          </span>
          {flag.approvalDocument && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              ✓ Aprovado
            </span>
          )}
        </div>

        {flag.description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{flag.description}</p>
        )}

        {flag.lastChangedAt && (
          <p className="text-xs text-slate-400 mt-2">
            Última alteração: {flag.lastChangedAt.toLocaleString("pt-BR")}
            {flag.lastChangeReason && ` — "${flag.lastChangeReason}"`}
          </p>
        )}
      </div>

      <div className="flex-shrink-0">
        <span
          role="status"
          aria-label={flag.enabled ? "Funcionalidade habilitada" : "Funcionalidade desabilitada"}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${flag.enabled ? "bg-blue-600" : "bg-slate-200"}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
              ${flag.enabled ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </span>
      </div>
    </div>
  );
}
