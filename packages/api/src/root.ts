import { createTRPCRouter } from "./trpc.ts";
import { featureFlagsRouter } from "./routers/feature-flags.ts";

// =============================================================================
// ROOT ROUTER — F0 (foundation)
// Sub-routers de produto (institutional, events, financial) adicionados em F1+
// =============================================================================

export const appRouter = createTRPCRouter({
  featureFlags: featureFlagsRouter,
  // institutional: institutionalRouter,  // F1
  // events: eventsRouter,                // F1
  // financial: financialRouter,          // F1
  // certification: certificationRouter,  // F1
  // communication: communicationRouter,  // F5
});

export type AppRouter = typeof appRouter;
