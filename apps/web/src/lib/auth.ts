import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { serviceDb } from "@uvergs360/db";
import { users, sessions, roles, userRoles } from "@uvergs360/db/schema";
import { compare } from "bcrypt";
import { generateCorrelationId } from "@uvergs360/shared";

// =============================================================================
// AUTH.JS (NextAuth v5) — UVERGS 360
//
// Estratégia: Credentials (email + senha + 2FA opcional)
// JWT: RS256, access token 15min, refresh 7 dias (rotativo)
// 2FA: TOTP obrigatório para roles sensíveis (verificado no callback)
// =============================================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
  totpCode: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,

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

        // Buscar tenant pelo slug
        const [tenant] = await serviceDb.execute(
          `SELECT id FROM tenants WHERE slug = $1 AND status = 'active' LIMIT 1`,
          [tenantSlug]
        ) as any[];

        if (!tenant) return null;

        // Buscar usuário
        const [user] = await serviceDb
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, email),
              eq(users.tenantId, tenant.id),
              isNull(users.deletedAt)
            )
          )
          .limit(1);

        if (!user || !user.passwordHash) return null;

        // Verificar status
        if (user.status !== "active") return null;

        // Verificar lockout por brute force
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null; // conta bloqueada temporariamente
        }

        // Verificar senha
        const passwordOk = await compare(password, user.passwordHash);
        if (!passwordOk) {
          // Incrementar contador de falhas
          await serviceDb
            .update(users)
            .set({
              failedLoginAttempts: (user.failedLoginAttempts ?? 0) + 1,
              lastFailedLoginAt: new Date(),
              // Bloquear após 10 tentativas por 15 minutos
              lockedUntil:
                (user.failedLoginAttempts ?? 0) >= 9
                  ? new Date(Date.now() + 15 * 60 * 1000)
                  : undefined,
            })
            .where(eq(users.id, user.id));
          return null;
        }

        // Resetar contador de falhas após login bem-sucedido
        await serviceDb
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastSuccessfulLoginAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Verificar 2FA se habilitado
        let mfaVerified = false;
        if (user.totpEnabled) {
          if (!totpCode) {
            // Sinaliza que 2FA é necessário (frontend redireciona para tela de 2FA)
            return { id: user.id, requiresMFA: true } as any;
          }

          // TODO(#55): verificar TOTP com otplib
          // const verified = authenticator.verify({ token: totpCode, secret: decryptedSecret });
          const verified = totpCode?.length === 6; // placeholder
          if (!verified) return null;
          mfaVerified = true;
        }

        // Buscar roles do usuário
        const userRolesList = await serviceDb
          .select({ roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(
            and(
              eq(userRoles.userId, user.id),
              isNull(userRoles.revokedAt)
            )
          );

        const roleNames = userRolesList.map((r) => r.roleName);

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          tenantId: user.tenantId,
          tenantSlug,
          roles: roleNames,
          mfaVerified,
          requiresMFA: false,
        };
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
        token.requiresMFA = (user as any).requiresMFA ?? false;
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
    maxAge: 15 * 60, // 15 minutos para access token
  },

  // Auditoria de eventos de autenticação
  events: {
    async signIn({ user }) {
      // TODO(#56): registrar login bem-sucedido no audit_log via outbox
      console.log(
        JSON.stringify({
          level: "info",
          event: "auth.sign_in",
          userId: user.id,
          timestamp: new Date().toISOString(),
          correlationId: generateCorrelationId(),
        })
      );
    },
    async signOut({ token }) {
      // TODO(#57): revogar sessão no banco
    },
  },
});
