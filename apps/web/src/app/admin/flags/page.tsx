"use client";

import { useState, useEffect } from "react";

import type { FeatureFlag } from "./_lib/mock-data";
import { CATEGORY_LABELS, DEV_MOCK_FLAGS } from "./_lib/mock-data";
import { FlagCard } from "./_components/FlagCard";

// =============================================================================
// ADMIN — FEATURE FLAGS
// Listagem e toggle de flags por tenant.
// Apenas admin_global com 2FA pode alterar.
// Flags VAL-LEGAL requerem documento de aprovação jurídica.
//
// Dado mock e card de flag extraídos para _lib/ e _components/
// (prompt 02 — burn-down de max-lines-per-function). Zero mudança de
// comportamento: mesmo JSX, mesmas classes, mesmas condições.
// =============================================================================

const CATEGORY_ORDER = [
  "val_legal",
  "val_negocio",
  "feature_incomplete",
  "operational",
] as const;

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  // setToggling ainda não é chamado — o toggle real (mutation tRPC) entra
  // quando o backend estiver conectado. O estado já existe para o disabled
  // visual do botão funcionar desde já.
  const [toggling, _setToggling] = useState<string | null>(null);

  useEffect(() => {
    // TODO(#58): usar tRPC client — trpc.featureFlags.list.query()
    setLoading(false);
    setFlags(DEV_MOCK_FLAGS);
  }, []);

  const groupedFlags = flags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    const bucket = acc[flag.category] ?? (acc[flag.category] = []);
    bucket.push(flag);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Carregando flags...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-800">Feature Flags</h1>
        <p className="text-sm text-slate-500 mt-1">
          Controle de funcionalidades por tenant. Flags VAL-LEGAL requerem aprovação jurídica formal.
        </p>
      </div>

      {/* Aviso de segurança */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-3">
          <span className="text-amber-600 text-lg">⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Atenção: flags VAL-LEGAL</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Flags na categoria "Validação Jurídica" só podem ser habilitadas após aprovação
              jurídica formal documentada. Habilitá-las sem aprovação pode gerar responsabilidade legal.
            </p>
          </div>
        </div>
      </div>

      {/* Grupos por categoria */}
      {CATEGORY_ORDER.map((category) => {
        const categoryFlags = groupedFlags[category];
        if (!categoryFlags?.length) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[category]}
            </h2>

            <div className="space-y-2">
              {categoryFlags.map((flag) => (
                <FlagCard key={flag.id} flag={flag} isToggling={toggling === flag.id} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
