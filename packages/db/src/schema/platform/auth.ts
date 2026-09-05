import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  inet,
  jsonb,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.ts";

// =============================================================================
// USERS — usuários do sistema
// Toda autenticação passa por aqui. Senha sempre hasheada (bcrypt custo 12+).
// =============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),

    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

    // Nome de exibição
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),

    // Senha hasheada — bcrypt custo 12+
    // null quando usuário usa SSO/link mágico (futuro)
    passwordHash: text("password_hash"),

    // 2FA — TOTP (RFC 6238)
    // Obrigatório para perfis sensíveis (admin, financeiro, presidência)
    totpSecret: text("totp_secret"), // encrypted at app level
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    totpVerifiedAt: timestamp("totp_verified_at", { withTimezone: true }),

    // Backup codes para 2FA
    totpBackupCodes: text("totp_backup_codes"), // JSON array hasheado

    // Status do usuário
    status: text("status", {
      enum: ["active", "inactive", "locked", "pending_verification"],
    })
      .notNull()
      .default("pending_verification"),

    // Proteção contra brute force
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastFailedLoginAt: timestamp("last_failed_login_at", { withTimezone: true }),
    lastSuccessfulLoginAt: timestamp("last_successful_login_at", {
      withTimezone: true,
    }),
    lastLoginIp: inet("last_login_ip"),

    // Metadados
    locale: text("locale").notNull().default("pt-BR"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),

    // Soft delete — usuários nunca são hard-deleted (preservar auditoria)
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Email único por tenant (não globalmente)
    emailTenantUnique: unique("users_email_tenant_unique").on(
      t.email,
      t.tenantId
    ),
    tenantIdIdx: index("users_tenant_id_idx").on(t.tenantId),
    statusIdx: index("users_status_idx").on(t.tenantId, t.status),
    emailIdx: index("users_email_idx").on(t.email),
  })
);

// =============================================================================
// ROLES — perfis de acesso
// =============================================================================

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Nome do role — convenção: snake_case
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),

    // Roles do sistema não podem ser deletados
    isSystem: boolean("is_system").notNull().default(false),

    // Roles que requerem 2FA obrigatório (§21)
    require2fa: boolean("require_2fa").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameTenantUnique: unique("roles_name_tenant_unique").on(t.tenantId, t.name),
    tenantIdIdx: index("roles_tenant_id_idx").on(t.tenantId),
  })
);

// Roles de sistema pré-definidos
export const SYSTEM_ROLES = [
  {
    name: "admin_global",
    displayName: "Administrador Global",
    require2fa: true,
    description: "Acesso completo ao sistema. Altamente auditado.",
  },
  {
    name: "presidency",
    displayName: "Presidência/Diretoria",
    require2fa: true,
    description: "BI, indicadores, relatórios e supervisão.",
  },
  {
    name: "financial",
    displayName: "Financeiro/Contábil",
    require2fa: true,
    description: "Cobranças, empenhos, conciliação e documentos fiscais.",
  },
  {
    name: "events",
    displayName: "Eventos",
    require2fa: false,
    description: "Cursos, inscrições, credenciamento e certificados.",
  },
  {
    name: "communication",
    displayName: "Comunicação/Atendimento",
    require2fa: false,
    description: "Campanhas, segmentos, inbox e CRM relacional.",
  },
  {
    name: "legal_technical",
    displayName: "Jurídico/Técnico",
    require2fa: false,
    description: "Biblioteca, tickets e conteúdos validados.",
  },
  {
    name: "credentialing_operator",
    displayName: "Operador de Credenciamento",
    require2fa: false,
    description: "Check-in/check-out do evento autorizado.",
  },
  {
    name: "chamber_user",
    displayName: "Usuário de Câmara",
    require2fa: false,
    description: "Dados e serviços da própria instituição.",
  },
  {
    name: "councilor",
    displayName: "Vereador",
    require2fa: false,
    description: "Dados pessoais, inscrições e certificados próprios.",
  },
  {
    name: "audit_read",
    displayName: "Auditor/Consulta",
    require2fa: true,
    description: "Leitura de áreas definidas e logs.",
  },
] as const;

// =============================================================================
// PERMISSIONS — permissões granulares por ação
// Verificação SEMPRE no backend — ocultar botão ≠ proteção (§10 v4.2)
// =============================================================================

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Convenção: domain.resource.action
    // Ex: event.create, finance.payment.write, certificate.revoke
    key: text("key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    module: text("module").notNull(), // domain de referência

    // Permissões que exigem dupla aprovação (§16.3)
    requiresDualApproval: boolean("requires_dual_approval")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyTenantUnique: unique("permissions_key_tenant_unique").on(
      t.tenantId,
      t.key
    ),
    tenantIdIdx: index("permissions_tenant_id_idx").on(t.tenantId),
    moduleIdx: index("permissions_module_idx").on(t.tenantId, t.module),
  })
);

// =============================================================================
// ROLE PERMISSIONS — vínculo many-to-many
// =============================================================================

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),

    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    grantedBy: uuid("granted_by"),
  },
  (t) => ({
    rolePermUnique: unique("role_permissions_unique").on(
      t.roleId,
      t.permissionId
    ),
    tenantIdIdx: index("role_permissions_tenant_id_idx").on(t.tenantId),
  })
);

// =============================================================================
// USER ROLES — vínculo usuário-role
// Um usuário pode ter múltiplos roles
// =============================================================================

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),

    // Escopo opcional de câmara (para roles chamber_user, credentialing_operator)
    chamberId: uuid("chamber_id"), // FK adicionado em migration de F1

    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    assignedBy: uuid("assigned_by"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by"),
    revokedReason: text("revoked_reason"),
  },
  (t) => ({
    userRoleUnique: unique("user_roles_user_role_unique").on(
      t.userId,
      t.roleId,
      t.chamberId
    ),
    tenantIdIdx: index("user_roles_tenant_id_idx").on(t.tenantId),
    userIdIdx: index("user_roles_user_id_idx").on(t.userId),
  })
);

// =============================================================================
// SESSIONS — sessões autenticadas
// Revogáveis individualmente ou em lote (ex: troca de senha)
// =============================================================================

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Token hasheado — nunca armazenar o token bruto
    tokenHash: text("token_hash").notNull(),
    // Refresh token hasheado
    refreshTokenHash: text("refresh_token_hash"),

    // 2FA confirmado nesta sessão
    mfaVerified: boolean("mfa_verified").notNull().default(false),
    mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),

    // Metadados da sessão
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    deviceFingerprint: text("device_fingerprint"),

    // Validade
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),

    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenHashUnique: unique("sessions_token_hash_unique").on(t.tokenHash),
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
    tenantIdIdx: index("sessions_tenant_id_idx").on(t.tenantId),
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
    // Para cleanup de sessões expiradas
    activeIdx: index("sessions_active_idx").on(
      t.tenantId,
      t.revokedAt,
      t.expiresAt
    ),
  })
);

// =============================================================================
// SIGNED ACCESS LINKS — links assinados de acesso restrito
// Usados no Portal do Servidor (acesso sem senha completa)
// NUNCA concedem acesso amplo — escopo restrito + expiração + nonce
// =============================================================================

export const signedAccessLinks = pgTable(
  "signed_access_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    // Nonce único — invalidado após uso
    nonce: text("nonce").notNull(),

    // Escopo restrito: o que este link pode fazer
    scope: text("scope").notNull(),
    // Ex: "chamber:read:C123,portal:server:C123"

    // Para qual usuário/entidade este link foi gerado
    targetUserId: uuid("target_user_id"),
    targetEmail: text("target_email"),
    targetChamberId: uuid("target_chamber_id"),

    // Quem gerou
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),

    // Expiração máxima: 48h (§13.2 v4.2)
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Uso único
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedFromIp: inet("used_from_ip"),
    usedFromUserAgent: text("used_from_user_agent"),

    // Revogação manual
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by"),
    revokedReason: text("revoked_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nonceUnique: unique("signed_access_links_nonce_unique").on(t.nonce),
    tenantIdIdx: index("signed_access_links_tenant_id_idx").on(t.tenantId),
    expiresAtIdx: index("signed_access_links_expires_at_idx").on(t.expiresAt),
    targetEmailIdx: index("signed_access_links_target_email_idx").on(
      t.targetEmail
    ),
  })
);
