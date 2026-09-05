import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, mfaProcedure, protectedProcedure } from "../trpc.ts";
import { featureFlags } from "@uvergs360/db/schema";
import { TRPCError } from "@trpc/server";

// =============================================================================
// FEATURE FLAGS ROUTER
// Leitura disponível para qualquer usuário autenticado.
// Escrita restrita a admin_global (com 2FA).
// =============================================================================

export const featureFlagsRouter = createTRPCRouter({
  /** Lista todas as flags do tenant */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.withTenant(async (tx) => {
        return tx
          .select()
          .from(featureFlags)
          .orderBy(featureFlags.category, featureFlags.key);
      });
    }),

  /** Verifica se uma flag está habilitada (com cache — use no middleware) */
  isEnabled: protectedProcedure
    .input(z.object({ key: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [flag] = await ctx.withTenant(async (tx) =>
        tx
          .select({ enabled: featureFlags.enabled })
          .from(featureFlags)
          .where(eq(featureFlags.key, input.key))
          .limit(1)
      );
      return { enabled: flag?.enabled ?? false };
    }),

  /** Altera o estado de uma flag (admin_global + 2FA obrigatório) */
  toggle: mfaProcedure
    .input(
      z.object({
        key: z.string().min(1),
        enabled: z.boolean(),
        reason: z.string().min(10, "Justificativa mínima de 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão admin_global
      if (!ctx.user.roles.includes("admin_global")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas administradores podem alterar feature flags.",
        });
      }

      const [flag] = await ctx.withTenant(async (tx) =>
        tx
          .select({ id: featureFlags.id, category: featureFlags.category })
          .from(featureFlags)
          .where(eq(featureFlags.key, input.key))
          .limit(1)
      );

      if (!flag) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Flag não encontrada." });
      }

      // Flags VAL-LEGAL: verificar documento de aprovação antes de habilitar
      if (flag.category === "val_legal" && input.enabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Flags VAL-LEGAL requerem aprovação jurídica formal. " +
            "Use o campo approval_document antes de habilitar.",
        });
      }

      await ctx.withTenant(async (tx) =>
        tx
          .update(featureFlags)
          .set({
            enabled: input.enabled,
            lastChangedBy: ctx.user.id,
            lastChangedAt: new Date(),
            lastChangeReason: input.reason,
            updatedAt: new Date(),
          })
          .where(eq(featureFlags.key, input.key))
      );

      // TODO(#53): disparar outbox event para auditoria
      return { success: true };
    }),

  /** Aprovação de flag VAL-LEGAL com documento (admin_global + 2FA) */
  approveValLegal: mfaProcedure
    .input(
      z.object({
        key: z.string().min(1),
        approvalDocument: z.string().min(5),
        approvedBy: z.string().min(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.roles.includes("admin_global")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.withTenant(async (tx) =>
        tx
          .update(featureFlags)
          .set({
            approvalDocument: input.approvalDocument,
            approvedBy: input.approvedBy,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(featureFlags.key, input.key),
              eq(featureFlags.category, "val_legal")
            )
          )
      );

      return { success: true };
    }),
});
