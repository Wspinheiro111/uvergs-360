import { NextResponse } from "next/server";

// =============================================================================
// HEALTH CHECK — /api/health
// Verifica banco de dados e serviços de apoio.
// =============================================================================

export async function GET() {
  const services = [];
  const start = Date.now();

  // --- PostgreSQL ---
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL não configurada");

    // Import dinâmico para evitar erro no build
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 5, connect_timeout: 5 });
    const db = drizzle(sql);
    const t0 = Date.now();
    await sql`SELECT 1`;
    services.push({ name: "postgresql", status: "ok", latencyMs: Date.now() - t0 });
    await sql.end();
  } catch (error) {
    services.push({
      name: "postgresql",
      status: "down",
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // --- Redis ---
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error("REDIS_URL não configurada");
    services.push({ name: "redis", status: "ok" });
  } catch (error) {
    services.push({
      name: "redis",
      status: "degraded",
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // --- Storage ---
  services.push({
    name: "object_storage",
    status: process.env.STORAGE_ENDPOINT ? "ok" : "degraded",
  });

  const hasDown = services.some((s) => s.status === "down");
  const hasDegraded = services.some((s) => s.status === "degraded");
  const status = hasDown ? "down" : hasDegraded ? "degraded" : "ok";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: "0.1.0-F0",
      services,
      uptimeMs: Date.now() - start,
    },
    { status: hasDown ? 503 : 200 }
  );
}
