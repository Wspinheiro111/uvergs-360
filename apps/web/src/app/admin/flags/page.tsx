"use client";

import { useState, useEffect } from "react";

// =============================================================================
// ADMIN — FEATURE FLAGS
// Listagem e toggle de flags por tenant.
// Apenas admin_global com 2FA pode alterar.
// Flags VAL-LEGAL requerem documento de aprovação jurídica.
// =============================================================================

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  category: "val_legal" | "val_negocio" | "feature_incomplete" | "operational";
  description: string | null;
  lastChangedAt: string | null;
  lastChangeReason: string | null;
  approvalDocument: string | null;
  approvedBy: string | null;
}

const CATEGORY_LABELS: Record<FeatureFlag["category"], string> = {
  val_legal: "Validação Jurídica",
  val_negocio: "Validação de Negócio",
  feature_incomplete: "Funcionalidade em Desenvolvimento",
  operational: "Operacional",
};

const CATEGORY_COLORS: Record<FeatureFlag["category"], string> = {
  val_legal: "bg-red-100 text-red-800 border-red-200",
  val_negocio: "bg-amber-100 text-amber-800 border-amber-200",
  feature_incomplete: "bg-slate-100 text-slate-700 border-slate-200",
  operational: "bg-green-100 text-green-800 border-green-200",
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Carregar flags via tRPC
  useEffect(() => {
    // TODO(#58): usar tRPC client
    // trpc.featureFlags.list.query()
    setLoading(false);
    setFlags([
      // Dados de exemplo para desenvolvimento (substituir por query real)
      {
        id: "1",
        key: "GERADOR_INSTRUMENTO_FILIACAO",
        enabled: false,
        category: "val_legal",
        description: "Gerador de minuta de Projeto de Resolução para filiação. Requer aprovação jurídica UVERGS.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
      {
        id: "2",
        key: "KIT_CONTRATACAO_DIRETA",
        enabled: false,
        category: "val_legal",
        description: "Kit de habilitação para contratação direta. Requer aprovação jurídica UVERGS.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
      {
        id: "3",
        key: "NFS_E_EMISSAO",
        enabled: false,
        category: "val_legal",
        description: "Emissão de NFS-e. Requer configuração do provedor e validação fiscal.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
      {
        id: "4",
        key: "RETENCOES_TRIBUTARIAS",
        enabled: false,
        category: "val_legal",
        description: "Cálculo de retenções tributárias. Requer validação da contabilidade UVERGS.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
      {
        id: "5",
        key: "SUPLENTE_COMUNICACAO_AUTOMATICA",
        enabled: false,
        category: "val_legal",
        description: "Comunicação automática a suplentes. Requer base legal definida pelo DPO/jurídico.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
      {
        id: "6",
        key: "PORTAL_TITULAR_LGPD",
        enabled: false,
        category: "val_legal",
        description: "Canal público de exercício de direitos do titular LGPD. Requer instrumentos de governança.",
        lastChangedAt: null,
        lastChangeReason: null,
        approvalDocument: null,
        approvedBy: null,
      },
    ]);
  }, []);

  const groupedFlags = flags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = [];
    acc[flag.category]!.push(flag);
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
      {(["val_legal", "val_negocio", "feature_incomplete", "operational"] as const).map((category) => {
        const categoryFlags = groupedFlags[category];
        if (!categoryFlags?.length) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[category]}
            </h2>

            <div className="space-y-2">
              {categoryFlags.map((flag) => (
                <div
                  key={flag.id}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-medium text-slate-800">
                        {flag.key}
                      </code>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[flag.category]}`}>
                        {CATEGORY_LABELS[flag.category]}
                      </span>
                      {flag.approvalDocument && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          ✓ Aprovado
                        </span>
                      )}
                    </div>

                    {flag.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {flag.description}
                      </p>
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
                      disabled={toggling === flag.id}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${flag.enabled
                          ? "bg-blue-600"
                          : "bg-slate-200"
                        }
                        ${toggling === flag.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
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
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
