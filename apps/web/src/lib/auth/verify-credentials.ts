// Lógica de verificação de credenciais, extraída do callback `authorize`
// do Auth.js (prompt 02 — burn-down de complexity/max-statements).
//
// Zero mudança de comportamento: mesma ordem de checagens, mesmo momento
// de fechar a conexão `sql`, mesma condição de lockout. A extração move
// código, não reordena decisão nenhuma.

export interface CredentialsInput {
  email: string;
  password: string;
  tenantSlug: string;
  totpCode?: string;
}

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  mfaVerified: boolean;
}

async function openServiceClient(dbUrl: string): Promise<SqlClient> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(dbUrl, { max: 2, idle_timeout: 10 });
  await sql.unsafe("SET ROLE service_role");
  return sql;
}

/**
 * Verifica email + senha contra o banco e retorna o usuário autorizado,
 * ou null em qualquer falha (tenant inexistente, senha errada, conta
 * bloqueada, usuário inativo). O motivo da falha não é diferenciado no
 * retorno de propósito — Auth.js não deve vazar qual das checagens falhou.
 */
export async function verifyCredentials(
  input: CredentialsInput
): Promise<AuthorizedUser | null> {
  const { email, password, tenantSlug, totpCode } = input;

  // O login ainda não conhece o tenant_id do usuário, portanto não pode
  // consultar `users` sob o RLS de app_user. A conexão de serviço é usada
  // somente neste fluxo de bootstrap da sessão; todas as consultas após o
  // login voltam ao DATABASE_URL com contexto explícito de tenant e usuário.
  const dbUrl = process.env.DATABASE_URL_SERVICE ?? process.env.DATABASE_URL;
  if (!dbUrl) return null;

  const sql = await openServiceClient(dbUrl);

  try {
    const tenant = await findActiveTenant(sql, tenantSlug);
    if (!tenant) return null;

    const user = await findActiveUser(sql, email, tenant.id);
    if (!user) return null;

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return null;
    }

    const passwordOk = await checkPassword(password, user.password_hash);
    if (!passwordOk) {
      await registerFailedLogin(sql, user.id);
      return null;
    }

    const mfaVerified = await verifyMfa(user, totpCode);
    if (user.totp_enabled && !mfaVerified) {
      await registerFailedLogin(sql, user.id);
      return null;
    }

    await registerSuccessfulLogin(sql, user.id);
    const roles = await fetchUserRoles(sql, user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.display_name,
      tenantId: user.tenant_id,
      tenantSlug,
      roles,
      mfaVerified,
    };
  } finally {
    await sql.end();
  }
}

async function verifyMfa(user: UserRow, totpCode?: string): Promise<boolean> {
  if (!user.totp_enabled) return false;
  const encryptionKey = process.env.TOTP_ENCRYPTION_KEY;
  if (!encryptionKey || !user.totp_secret || !totpCode) return false;
  const { decryptTotpSecret, verifyTotpCode } = await import("./totp");
  try {
    return verifyTotpCode(decryptTotpSecret(user.totp_secret, encryptionKey), totpCode);
  } catch {
    return false;
  }
}

/** Verifica senha contra o hash pbkdf2 gravado (seed de dev). */
/** postgres.js usa `export =` — sob esModuleInterop o valor do import é
 * a própria função (o import default é um shim de runtime, não existe
 * como propriedade no sistema de tipos). */
type SqlClient = ReturnType<typeof import("postgres")>;

interface TenantRow {
  id: string;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  status: string;
  totp_enabled: boolean;
  totp_secret: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  tenant_id: string;
}

async function findActiveTenant(
  sql: SqlClient,
  tenantSlug: string
): Promise<TenantRow | null> {
  const [tenant] = await sql<TenantRow[]>`
    SELECT id FROM tenants WHERE slug = ${tenantSlug} AND status = 'active' LIMIT 1
  `;
  return tenant ?? null;
}

/**
 * Retorna o usuário só se tiver senha cadastrada e status ativo — as duas
 * checagens que antes viviam soltas em verifyCredentials, preservadas aqui
 * com o mesmo efeito: qualquer uma das duas falhando resulta em null.
 */
async function findActiveUser(
  sql: SqlClient,
  email: string,
  tenantId: string
): Promise<UserRow | null> {
  const [user] = await sql<UserRow[]>`
    SELECT id, email, display_name, password_hash, status,
           totp_enabled, totp_secret, failed_login_attempts, locked_until, tenant_id
    FROM users
    WHERE email = ${email} AND tenant_id = ${tenantId}
      AND deleted_at IS NULL LIMIT 1
  `;
  if (!user || !user.password_hash) return null;
  if (user.status !== "active") return null;
  return user;
}

async function checkPassword(password: string, passwordHash: string): Promise<boolean> {
  const { pbkdf2Sync } = await import("crypto");
  const [, salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  const inputHash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  const { timingSafeEqual } = await import("crypto");
  const input = Buffer.from(inputHash, "hex");
  const stored = Buffer.from(storedHash, "hex");
  return input.length === stored.length && timingSafeEqual(input, stored);
}

async function registerFailedLogin(sql: SqlClient, userId: string): Promise<void> {
  await sql`UPDATE users SET
    failed_login_attempts = failed_login_attempts + 1,
    last_failed_login_at = NOW(),
    locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
    WHERE id = ${userId}`;
}

async function registerSuccessfulLogin(sql: SqlClient, userId: string): Promise<void> {
  await sql`
    UPDATE users SET failed_login_attempts = 0, locked_until = NULL,
    last_successful_login_at = NOW() WHERE id = ${userId}
  `;
}

async function fetchUserRoles(sql: SqlClient, userId: string): Promise<string[]> {
  const roles = await sql`
    SELECT r.name FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = ${userId} AND ur.revoked_at IS NULL
  `;
  return roles.map((r) => r.name as string);
}
