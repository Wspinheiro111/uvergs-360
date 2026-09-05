import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  pgSchema,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =============================================================================
// TENANT — entidade raiz do isolamento multi-tenant
// Toda entidade de domínio carrega tenant_id referenciando este registro.
// ADR-002: schema único + RLS por tenant_id
// =============================================================================

export const tenants = pgTable(
  "tenants",
  {
    // IDs externos sempre UUID não-sequencial (anti-enumeração §18)
    id: uuid("id").defaultRandom().primaryKey(),

    // Identificador legível único (slug para subdomain/routing)
    slug: text("slug").notNull(),

    // Nome oficial da organização
    name: text("name").notNull(),

    // Status operacional
    status: text("status", {
      enum: ["active", "suspended", "trial", "cancelled"],
    })
      .notNull()
      .default("active"),

    // Timezone oficial do tenant (exibição de datas)
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),

    // Plano/tier (para futuras funcionalidades multi-produto)
    plan: text("plan", { enum: ["standard", "professional", "enterprise"] })
      .notNull()
      .default("standard"),

    // Metadados de contato do tenant
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
  },
  (t) => ({
    slugUnique: unique("tenants_slug_unique").on(t.slug),
    statusIdx: index("tenants_status_idx").on(t.status),
  })
);

// =============================================================================
// TENANT THEME — identidade visual configurável por tenant
// =============================================================================

export const tenantThemes = pgTable(
  "tenant_themes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Cores primárias
    primaryColor: text("primary_color").notNull().default("#1a56db"),
    secondaryColor: text("secondary_color").notNull().default("#7e3af2"),
    accentColor: text("accent_color"),

    // Logo
    logoUrl: text("logo_url"),
    logoAltText: text("logo_alt_text"),
    faviconUrl: text("favicon_url"),

    // Identidade
    organizationFullName: text("organization_full_name"),
    tagline: text("tagline"),

    // Rodapé de documentos oficiais
    documentFooterText: text("document_footer_text"),

    // Metadados para certificados e PDFs
    certificateSignatureImageUrl: text("certificate_signature_image_url"),
    certificateSignerName: text("certificate_signer_name"),
    certificateSignerTitle: text("certificate_signer_title"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdUnique: unique("tenant_themes_tenant_id_unique").on(t.tenantId),
  })
);

// =============================================================================
// FEATURE FLAGS — controle de funcionalidades por tenant
// Funcionalidades VAL-LEGAL entram sempre desligadas (enabled: false)
// Módulos incompletos entram com enabled: false até Gate correspondente
// =============================================================================

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Chave única por tenant — convenção: SCREAMING_SNAKE_CASE
    // Ex: GERADOR_INSTRUMENTO_FILIACAO, WHATSAPP_CAMPANHAS, NFS_E
    key: text("key").notNull(),

    // Estado atual
    enabled: boolean("enabled").notNull().default(false),

    // Categoria da flag
    category: text("category", {
      enum: ["val_legal", "val_negocio", "feature_incomplete", "operational"],
    })
      .notNull()
      .default("feature_incomplete"),

    // Descrição para admin panel
    description: text("description"),

    // Registro de quem ativou/desativou (auditabilidade)
    lastChangedBy: uuid("last_changed_by"), // referência a users (sem FK para evitar circular)
    lastChangedAt: timestamp("last_changed_at", { withTimezone: true }),
    lastChangeReason: text("last_change_reason"),

    // Para flags VAL-LEGAL: referência ao documento de aprovação
    approvalDocument: text("approval_document"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantKeyUnique: unique("feature_flags_tenant_key_unique").on(
      t.tenantId,
      t.key
    ),
    tenantIdIdx: index("feature_flags_tenant_id_idx").on(t.tenantId),
    categoryIdx: index("feature_flags_category_idx").on(t.category),
    enabledIdx: index("feature_flags_enabled_idx").on(t.tenantId, t.enabled),
  })
);

// Flags VAL-LEGAL pré-definidas — criadas desligadas no seed
export const VAL_LEGAL_FLAGS = [
  {
    key: "GERADOR_INSTRUMENTO_FILIACAO",
    description:
      "Gerador de minuta de Projeto de Resolução para filiação. Requer aprovação jurídica UVERGS.",
    category: "val_legal" as const,
  },
  {
    key: "KIT_CONTRATACAO_DIRETA",
    description:
      "Kit de habilitação para contratação direta. Requer aprovação jurídica UVERGS.",
    category: "val_legal" as const,
  },
  {
    key: "NFS_E_EMISSAO",
    description:
      "Emissão de NFS-e. Requer configuração do provedor e validação fiscal.",
    category: "val_legal" as const,
  },
  {
    key: "RETENCOES_TRIBUTARIAS",
    description:
      "Cálculo de retenções tributárias. Requer validação da contabilidade UVERGS.",
    category: "val_legal" as const,
  },
  {
    key: "SUPLENTE_COMUNICACAO_AUTOMATICA",
    description:
      "Comunicação automática a suplentes. Requer base legal definida pelo DPO/jurídico.",
    category: "val_legal" as const,
  },
  {
    key: "PORTAL_TITULAR_LGPD",
    description:
      "Canal público de exercício de direitos do titular LGPD. Requer instrumentos de governança.",
    category: "val_legal" as const,
  },
] as const;
