import type { FeatureFlagRow } from "@/lib/admin-data";

export const CATEGORY_ORDER: FeatureFlagRow["category"][] = [
  "val_legal",
  "val_negocio",
  "feature_incomplete",
  "operational",
];

export const CATEGORY_LABELS: Record<FeatureFlagRow["category"], string> = {
  val_legal: "Validação Jurídica",
  val_negocio: "Validação de Negócio",
  feature_incomplete: "Funcionalidade em desenvolvimento",
  operational: "Operacional",
};

export const CATEGORY_COLORS: Record<FeatureFlagRow["category"], string> = {
  val_legal: "bg-red-100 text-red-800 border-red-200",
  val_negocio: "bg-amber-100 text-amber-800 border-amber-200",
  feature_incomplete: "bg-slate-100 text-slate-700 border-slate-200",
  operational: "bg-green-100 text-green-800 border-green-200",
};
