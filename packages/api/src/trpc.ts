import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TRPCContext } from "./context/index.ts";
import {
  AccessScope,
  ForbiddenError,
  UnauthorizedError,
  FeatureFlagDisabledError,
} from "@uvergs360/shared";

// =============================================================================
// INIT tRPC
// =============================================================================

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// =============================================================================
// MIDDLEWARE — CORRELAÇÃO
// Injeta correlation ID no contexto de log.
// =============================================================================

const correlationMiddleware = t.middleware(async ({ ctx, next }) => {
  // Correlation ID já está no contexto — só garantir que está presente
  return next({ ctx });
});

// =============================================================================
// MIDDLEWARE — AUTENTICAÇÃO
// Garante que há usuário autenticado. Lança UNAUTHORIZED se não houver.
// =============================================================================

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Autenticação necessária.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// =============================================================================
// MIDDLEWARE — 2FA
// Garante que o usuário completou 2FA quando obrigatório para seu role.
// Roles que exigem 2FA: admin_global, presidency, financial, audit_read
// =============================================================================

const ROLES_REQUIRING_2FA = new Set([
  "admin_global",
  "presidency",
  "financial",
  "audit_read",
]);

const mfaMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

  const requiresMFA = ctx.user.roles.some((r) => ROLES_REQUIRING_2FA.has(r));
  if (requiresMFA && !ctx.user.mfaVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Autenticação de dois fatores necessária para este perfil.",
    });
  }

  return next({ ctx });
});

// =============================================================================
// MIDDLEWARE — FEATURE FLAG
// Verifica se uma flag está habilitada para o tenant.
// Bloqueia VAL-LEGAL desligadas com 403 explícito.
// =============================================================================

export function requireFeatureFlag(flagKey: string) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.tenantId) throw new TRPCError({ code: "UNAUTHORIZED" });

    // TODO(#51): query à tabela feature_flags com cache Redis (TTL 60s)
    // Por enquanto, todas as flags retornam como desligadas (seguro para F0)
    const enabled = false; // substituir por query real

    if (!enabled) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Funcionalidade não habilitada: ${flagKey}`,
      });
    }

    return next({ ctx });
  });
}

// =============================================================================
// MIDDLEWARE — AUDITORIA
// Registra automaticamente ações críticas no AuditLog via outbox.
// Deve ser o ÚLTIMO middleware da cadeia (após auth + mfa).
// =============================================================================

interface AuditOptions {
  action: string;
  module: string;
  entityType: string;
  /** Função que extrai o entityId do input da procedure */
  getEntityId?: (input: unknown) => string;
  /** Ação que exige justificativa obrigatória */
  requireJustification?: boolean;
}

export function withAudit(options: AuditOptions) {
  return t.middleware(async ({ ctx, input, next }) => {
    const result = await next({ ctx });

    if (ctx.user && result.ok) {
      // TODO(#52): inserir outbox_event com action, entityId, correlationId
      // O worker consome o outbox e grava no audit_log via service_role
      // Implementação completa em F0/audit
    }

    return result;
  });
}

// =============================================================================
// PROCEDIMENTOS PÚBLICOS E PROTEGIDOS
// =============================================================================

/** Procedimento público — sem autenticação */
export const publicProcedure = t.procedure.use(correlationMiddleware);

/** Procedimento autenticado — qualquer usuário logado */
export const protectedProcedure = t.procedure
  .use(correlationMiddleware)
  .use(authMiddleware);

/** Procedimento que exige 2FA verificado */
export const mfaProcedure = t.procedure
  .use(correlationMiddleware)
  .use(authMiddleware)
  .use(mfaMiddleware);
