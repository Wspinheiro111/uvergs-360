// Constantes e dados de exemplo da tela de Feature Flags.
// Extraído de page.tsx (prompt 02 — burn-down de max-lines-per-function).
//
// TODO(#58): DEV_MOCK_FLAGS existe só até o tRPC client estar plugado
// (trpc.featureFlags.list.query()). Remover quando a query real substituir.

export interface FeatureFlag {
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

export const CATEGORY_LABELS: Record<FeatureFlag["category"], string> = {
  val_legal: "Validação Jurídica",
  val_negocio: "Validação de Negócio",
  feature_incomplete: "Funcionalidade em Desenvolvimento",
  operational: "Operacional",
};

export const CATEGORY_COLORS: Record<FeatureFlag["category"], string> = {
  val_legal: "bg-red-100 text-red-800 border-red-200",
  val_negocio: "bg-amber-100 text-amber-800 border-amber-200",
  feature_incomplete: "bg-slate-100 text-slate-700 border-slate-200",
  operational: "bg-green-100 text-green-800 border-green-200",
};

export const DEV_MOCK_FLAGS: FeatureFlag[] = [
  {
    id: "1",
    key: "GERADOR_INSTRUMENTO_FILIACAO",
    enabled: false,
    category: "val_legal",
    description:
      "Gerador de minuta de Projeto de Resolução para filiação. Requer aprovação jurídica UVERGS.",
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
    description:
      "Kit de habilitação para contratação direta. Requer aprovação jurídica UVERGS.",
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
    description:
      "Cálculo de retenções tributárias. Requer validação da contabilidade UVERGS.",
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
    description:
      "Comunicação automática a suplentes. Requer base legal definida pelo DPO/jurídico.",
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
    description:
      "Canal público de exercício de direitos do titular LGPD. Requer instrumentos de governança.",
    lastChangedAt: null,
    lastChangeReason: null,
    approvalDocument: null,
    approvedBy: null,
  },
];
