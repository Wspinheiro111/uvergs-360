import type { NextRequest } from "next/server";
import { db, withTenantContext } from "@uvergs360/db";
import { generateCorrelationId, UnauthorizedError } from "@uvergs360/shared";

// =============================================================================
// CONTEXTO tRPC
// Criado a cada requisição — nunca reutilizar entre requests.
// =============================================================================

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  mfaVerified: boolean;
  sessionId: string;
}

export interface TRPCContext {
  req: NextRequest;
  correlationId: string;
  user: AuthUser | null;
  tenantId: string | null;
  db: typeof db;
  /** Inicia transação com RLS de tenant injetado */
  withTenant: <T>(cb: (tx: typeof db) => Promise<T>) => Promise<T>;
}

export async function createTRPCContext(req: NextRequest): Promise<TRPCContext> {
  const correlationId = req.headers.get("x-correlation-id") ?? generateCorrelationId();

  // Autenticação delegada ao middleware de auth (next-auth session token)
  // O user é resolvido pelo middleware antes de chegar aqui
  const user = await resolveUser(req);

  return {
    req,
    correlationId,
    user,
    tenantId: user?.tenantId ?? null,
    db,
    withTenant: async <T>(cb: (tx: typeof db) => Promise<T>) => {
      if (!user) throw new UnauthorizedError();
      return withTenantContext(user.tenantId, user.id, cb);
    },
  };
}

// Resolver o usuário da sessão JWT (implementação completa em F0/auth)
async function resolveUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    // TODO(#50): verificar JWT RS256 e carregar sessão do banco
    // Por ora, retorna null (rotas públicas apenas)
    return null;
  } catch {
    return null;
  }
}
