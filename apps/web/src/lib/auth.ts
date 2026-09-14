import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { verifyCredentials } from "./auth/verify-credentials";
import { logger } from "./logger";

// =============================================================================
// AUTH.JS (NextAuth v5) — UVERGS 360
// Autenticação com email + senha + 2FA TOTP opcional
//
// A verificação de credenciais mora em ./auth/verify-credentials.ts
// (prompt 02 — burn-down de complexity/max-statements). Este arquivo
// cuida só da integração com Auth.js: schema, callbacks, sessão.
// =============================================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
  totpCode: z.string().optional(),
});

interface SessionUser {
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  mfaVerified: boolean;
}

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
          const user = await verifyCredentials({ email, password, tenantSlug, totpCode });
          return user;
        } catch (err) {
          logger.error("Auth error", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as unknown as SessionUser & { id: string };
        token.userId = authUser.id;
        token.tenantId = authUser.tenantId;
        token.tenantSlug = authUser.tenantSlug;
        token.roles = authUser.roles ?? [];
        token.mfaVerified = authUser.mfaVerified ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      const extendedSession = session as typeof session & SessionUser;
      extendedSession.user.id = token.userId as string;
      extendedSession.tenantId = token.tenantId as string;
      extendedSession.tenantSlug = token.tenantSlug as string;
      extendedSession.roles = (token.roles as string[]) ?? [];
      extendedSession.mfaVerified = (token.mfaVerified as boolean) ?? false;
      return extendedSession;
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
