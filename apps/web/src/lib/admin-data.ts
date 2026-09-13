import { auth } from "./auth";
import { logger } from "./logger";

type SqlClient = ReturnType<typeof import("postgres")>;

const ADMIN_ROLES = ["admin_global", "presidency", "audit_read"];
const USER_ROLES = ["admin_global", "presidency"];

export type AdminDataResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type UserStatus = "active" | "inactive" | "locked" | "pending_verification";

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  totpEnabled: boolean;
  roles: string[];
  lastSuccessfulLoginAt: Date | null;
  createdAt: Date;
}

export interface UserDirectory {
  users: AdminUserRow[];
  totals: Record<UserStatus | "all", number>;
}

export interface FeatureFlagRow {
  id: string;
  key: string;
  enabled: boolean;
  category: "val_legal" | "val_negocio" | "feature_incomplete" | "operational";
  description: string | null;
  lastChangedAt: Date | null;
  lastChangeReason: string | null;
  approvalDocument: string | null;
  approvedBy: string | null;
}

export interface AuditLogRow {
  id: string;
  createdAt: Date;
  userDisplayName: string | null;
  userEmail: string | null;
  action: string;
  module: string;
  entityType: string;
  outcome: "success" | "failure" | "partial";
  justification: string | null;
  correlationId: string;
}

export interface AuditDirectory {
  logs: AuditLogRow[];
  modules: string[];
}

export interface AdminOverview {
  users: number;
  activeUsers: number;
  enabledFlags: number;
  totalFlags: number;
  auditEvents24h: number;
}

export type ChamberStatus = "active" | "inactive" | "pending";
export type AffiliationStatus = "affiliated" | "prospect" | "inactive";

export interface InstitutionalChamberRow {
  id: string;
  legalName: string;
  shortName: string | null;
  municipality: string;
  stateCode: string;
  mesoregion: string | null;
  status: ChamberStatus;
  affiliationStatus: AffiliationStatus;
  councilors: number;
  email: string | null;
  phone: string | null;
}

export interface InstitutionalDirectory {
  chambers: InstitutionalChamberRow[];
  totals: {
    chambers: number;
    affiliated: number;
    municipalities: number;
    activeMandates: number;
  };
  regions: string[];
}

interface SessionContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

interface CountRow {
  total: number;
  active: number;
  inactive: number;
  locked: number;
  pending: number;
}

async function getSessionContext(allowedRoles: string[]): Promise<AdminDataResult<SessionContext>> {
  const session = await auth();
  const extended = session as typeof session & {
    tenantId?: string;
    roles?: string[];
  };
  const userId = session?.user?.id;
  const tenantId = extended?.tenantId;
  const roles = extended?.roles ?? [];

  if (!userId || !tenantId) {
    return { data: null, error: "Sessão inválida. Entre novamente para consultar os dados." };
  }
  if (!roles.some((role) => allowedRoles.includes(role))) {
    return { data: null, error: "Seu perfil não possui permissão para esta consulta." };
  }

  return { data: { userId, tenantId, roles }, error: null };
}

export async function withAdminRead<T>(
  allowedRoles: string[],
  query: (sql: SqlClient) => Promise<T>
): Promise<AdminDataResult<T>> {
  const context = await getSessionContext(allowedRoles);
  if (!context.data) return { data: null, error: context.error };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return { data: null, error: "Banco de dados não configurado." };

  const postgres = (await import("postgres")).default;
  const client = postgres(dbUrl, { max: 1, idle_timeout: 10, connect_timeout: 10 });

  try {
    const data = await client.begin(async (transaction) => {
      await transaction`SELECT set_config('app.current_tenant_id', ${context.data.tenantId}, true)`;
      await transaction`SELECT set_config('app.current_user_id', ${context.data.userId}, true)`;
      return query(transaction as unknown as SqlClient);
    });
    return { data: data as unknown as T, error: null };
  } catch (error) {
    logger.error("Falha na consulta administrativa", error);
    return { data: null, error: "Não foi possível consultar os dados agora." };
  } finally {
    await client.end();
  }
}

export async function loadAdminOverview(): Promise<AdminDataResult<AdminOverview>> {
  return withAdminRead(ADMIN_ROLES, async (sql) => {
    const [overview] = await sql<AdminOverview[]>`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS users,
        (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL AND status = 'active') AS "activeUsers",
        (SELECT COUNT(*)::int FROM feature_flags WHERE enabled) AS "enabledFlags",
        (SELECT COUNT(*)::int FROM feature_flags) AS "totalFlags",
        (SELECT COUNT(*)::int FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours') AS "auditEvents24h"
    `;
    return overview ?? { users: 0, activeUsers: 0, enabledFlags: 0, totalFlags: 0, auditEvents24h: 0 };
  });
}

export async function loadInstitutionalDirectory(
  search: string,
  affiliation: AffiliationStatus | "all",
  region: string
): Promise<AdminDataResult<InstitutionalDirectory>> {
  return withAdminRead(ADMIN_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const chambers = await sql<InstitutionalChamberRow[]>`
      SELECT
        c.id,
        c.legal_name AS "legalName",
        c.short_name AS "shortName",
        m.name AS municipality,
        m.state_code AS "stateCode",
        m.mesoregion,
        c.status,
        c.affiliation_status AS "affiliationStatus",
        COUNT(md.id) FILTER (WHERE md.status IN ('active', 'licensed'))::int AS councilors,
        c.email,
        c.phone
      FROM chambers c
      JOIN public_ref.municipalities m ON m.id = c.municipality_id
      LEFT JOIN mandates md ON md.chamber_id = c.id AND md.tenant_id = c.tenant_id
      WHERE (${search.length === 0}
        OR c.legal_name ILIKE ${pattern}
        OR COALESCE(c.short_name, '') ILIKE ${pattern}
        OR m.name ILIKE ${pattern})
        AND (${affiliation === "all"} OR c.affiliation_status = ${affiliation})
        AND (${region.length === 0} OR COALESCE(m.mesoregion, '') = ${region})
      GROUP BY c.id, m.name, m.state_code, m.mesoregion
      ORDER BY m.name, c.legal_name
      LIMIT 100
    `;

    const [totals] = await sql<InstitutionalDirectory["totals"][]>`
      SELECT
        (SELECT COUNT(*)::int FROM chambers) AS chambers,
        (SELECT COUNT(*)::int FROM chambers WHERE affiliation_status = 'affiliated') AS affiliated,
        (SELECT COUNT(DISTINCT municipality_id)::int FROM chambers) AS municipalities,
        (SELECT COUNT(*)::int FROM mandates WHERE status IN ('active', 'licensed')) AS "activeMandates"
    `;
    const regionRows = await sql<{ region: string }[]>`
      SELECT DISTINCT m.mesoregion AS region
      FROM chambers c
      JOIN public_ref.municipalities m ON m.id = c.municipality_id
      WHERE m.mesoregion IS NOT NULL AND m.mesoregion <> ''
      ORDER BY m.mesoregion
    `;

    return {
      chambers,
      totals: totals ?? { chambers: 0, affiliated: 0, municipalities: 0, activeMandates: 0 },
      regions: regionRows.map((item) => item.region),
    };
  });
}

export async function loadUsers(
  search: string,
  status: UserStatus | "all"
): Promise<AdminDataResult<UserDirectory>> {
  return withAdminRead(USER_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const users = await sql<AdminUserRow[]>`
      SELECT
        u.id,
        u.display_name AS "displayName",
        u.email,
        u.status,
        u.email_verified AS "emailVerified",
        u.totp_enabled AS "totpEnabled",
        u.last_successful_login_at AS "lastSuccessfulLoginAt",
        u.created_at AS "createdAt",
        COALESCE((
          SELECT ARRAY_AGG(r.display_name ORDER BY r.display_name)
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
            AND ur.revoked_at IS NULL
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ), ARRAY[]::text[]) AS roles
      FROM users u
      WHERE u.deleted_at IS NULL
        AND (${search.length === 0} OR u.display_name ILIKE ${pattern} OR u.email ILIKE ${pattern})
        AND (${status === "all"} OR u.status = ${status})
      ORDER BY u.display_name, u.email
      LIMIT 100
    `;
    const [counts] = await sql<CountRow[]>`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
        COUNT(*) FILTER (WHERE status = 'locked')::int AS locked,
        COUNT(*) FILTER (WHERE status = 'pending_verification')::int AS pending
      FROM users
      WHERE deleted_at IS NULL
    `;
    return {
      users,
      totals: {
        all: counts?.total ?? 0,
        active: counts?.active ?? 0,
        inactive: counts?.inactive ?? 0,
        locked: counts?.locked ?? 0,
        pending_verification: counts?.pending ?? 0,
      },
    };
  });
}

export async function loadFeatureFlags(): Promise<AdminDataResult<FeatureFlagRow[]>> {
  return withAdminRead(ADMIN_ROLES, async (sql) => sql<FeatureFlagRow[]>`
    SELECT
      id, key, enabled, category, description,
      last_changed_at AS "lastChangedAt",
      last_change_reason AS "lastChangeReason",
      approval_document AS "approvalDocument",
      approved_by AS "approvedBy"
    FROM feature_flags
    ORDER BY category, key
  `);
}

export async function loadAuditLogs(
  search: string,
  module: string,
  outcome: string
): Promise<AdminDataResult<AuditDirectory>> {
  return withAdminRead(ADMIN_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const logs = await sql<AuditLogRow[]>`
      SELECT
        id, created_at AS "createdAt",
        user_display_name AS "userDisplayName",
        user_email AS "userEmail",
        action, module, entity_type AS "entityType", outcome,
        justification, correlation_id AS "correlationId"
      FROM audit_logs
      WHERE (${search.length === 0}
        OR action ILIKE ${pattern}
        OR COALESCE(user_email, '') ILIKE ${pattern}
        OR COALESCE(user_display_name, '') ILIKE ${pattern})
        AND (${module.length === 0} OR audit_logs.module = ${module})
        AND (${outcome.length === 0} OR audit_logs.outcome = ${outcome})
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const moduleRows = await sql<{ module: string }[]>`
      SELECT DISTINCT module FROM audit_logs ORDER BY module
    `;
    return { logs, modules: moduleRows.map((row) => row.module) };
  });
}
