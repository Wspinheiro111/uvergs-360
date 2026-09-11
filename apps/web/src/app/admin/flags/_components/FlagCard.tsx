// Card individual de uma feature flag. Extraído de page.tsx — era o bloco
// de UI dentro do .map() de flags (prompt 02 — burn-down de
// max-lines-per-function). Nenhuma classe, condição ou texto mudou.

import type { FeatureFlag } from "../_lib/mock-data";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "../_lib/mock-data";

interface FlagCardProps {
  flag: FeatureFlag;
  isToggling: boolean;
}

export function FlagCard({ flag, isToggling }: FlagCardProps) {
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
            Última alteração: {new Date(flag.lastChangedAt).toLocaleString("pt-BR")}
            {flag.lastChangeReason && ` — "${flag.lastChangeReason}"`}
          </p>
        )}
      </div>

      <div className="flex-shrink-0">
        {/* Toggle visual (ação real via modal com justificativa) */}
        <button
          disabled={isToggling}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${flag.enabled ? "bg-blue-600" : "bg-slate-200"}
            ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          title={
            flag.category === "val_legal" && !flag.enabled
              ? "Requer aprovação jurídica"
              : flag.enabled
              ? "Desabilitar"
              : "Habilitar"
          }
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
              ${flag.enabled ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </button>
      </div>
    </div>
  );
}
