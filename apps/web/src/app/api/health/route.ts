import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const services: any[] = [];
  const start = Date.now();

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL não configurada");
    const postgres = (await import("postgres")).default;
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 5, connect_timeout: 5 });
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

  services.push({ name: "redis", status: process.env.REDIS_URL ? "ok" : "degraded" });
  services.push({ name: "object_storage", status: process.env.STORAGE_ENDPOINT ? "ok" : "degraded" });

  const hasDown = services.some((s) => s.status === "down");

  return NextResponse.json(
    {
      status: hasDown ? "down" : "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0-F0",
      services,
      uptimeMs: Date.now() - start,
    },
    { status: hasDown ? 503 : 200 }
  );
}
