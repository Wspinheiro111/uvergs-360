// =============================================================================
// UVERGS 360 — Schema Index
// Exporta todos os schemas Drizzle para uso pelo ORM e migrations
// =============================================================================

// Platform
export * from "./platform/tenant.ts";
export * from "./platform/auth.ts";
export * from "./platform/audit.ts";

// Institutional (F1)
export * from "./institutional/core.ts";

// Events (F1)
export * from "./events/core.ts";

// Financial (F1/F4)
export * from "./financial/core.ts";
export * from "./financial/management.ts";

// Communication (F5)
export * from "./communication/core.ts";

// Privacy (LGPD)
// export * from "./privacy/consent.ts";
// export * from "./privacy/data-subject-request.ts";
