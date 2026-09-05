import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// =============================================================================
// AUTH.JS (NextAuth v5) — UVERGS 360
// Autenticação com email + senha + 2FA TOTP opcional
// =============================================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
  totpCode: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  providers: [
    Credentials({
      name: "email-password",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
        totpCode: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, tenantSlug, totpCode } = parsed.data;

        try {
          // Import dinâmico — não carrega postgres no build time
          const postgres = (await import("postgres")).default;
          const dbUrl = process.env.DATABASE_URL;
          if (!dbUrl) return null;

          const sql = postgres(dbUrl, { max: 2, idle_timeout: 10 });

          // Buscar tenant
          const [tenant] = await sql`
            SELECT id FROM tenants WHERE slug = ${tenantSlug} AND status = 'active' LIMIT 1
          `;
          if (!tenant) { await sql.end(); return null; }

          // Buscar usuário
          const [user] = await sql`
            SELECT id, email, display_name, password_hash, status,
                   totp_enabled, failed_login_attempts, locked_until, tenant_id
            FROM users
            WHERE email = ${email} AND tenant_id = ${tenant.id}
              AND deleted_at IS NULL LIMIT 1
          `;

          if (!user || !user.password_hash) { await sql.end(); return null; }
          if (user.status !== "active") { await sql.end(); return null; }
          if (user.locked_until && new Date(user.locked_until) > new Date()) {
            await sql.end(); return null;
          }

          // Verificar senha (pbkdf2 do seed de dev)
          const { pbkdf2Sync } = await import("crypto");
          const [, salt, storedHash] = user.password_hash.split(":");
          if (!salt || !storedHash) { await sql.end(); return null; }
          const inputHash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
          const passwordOk = inputHash === storedHash;

          if (!passwordOk) {
            await sql`
              UPDATE users SET failed_login_attempts = failed_login_attempts + 1,
              last_failed_login_at = NOW() WHERE id = ${user.id}
            `;
            await sql.end(); return null;
          }

          // Reset contador + registrar login
          await sql`
            UPDATE users SET failed_login_attempts = 0, locked_until = NULL,
            last_successful_login_at = NOW() WHERE id = ${user.id}
          `;

          // Buscar roles
          const roles = await sql`
            SELECT r.name FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = ${user.id} AND ur.revoked_at IS NULL
          `;

          await sql.end();

          return {
            id: user.id,
            email: user.email,
            name: user.display_name,
            tenantId: user.tenant_id,
            tenantSlug,
            roles: roles.map((r: any) => r.name),
            mfaVerified: false,
          };
        } catch (err) {
          console.error("Auth error:", err instanceof Error ? err.message : err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.roles = (user as any).roles ?? [];
        token.mfaVerified = (user as any).mfaVerified ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        (session as any).tenantId = token.tenantId;
        (session as any).tenantSlug = token.tenantSlug;
        (session as any).roles = token.roles;
        (session as any).mfaVerified = token.mfaVerified;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 horas
  },
});
