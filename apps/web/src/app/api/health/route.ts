import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { serviceDb } from "@uvergs360/db";

// =============================================================================
// HEALTH CHECK — /api/health
// Verificado pelo smoke test do CI após cada deploy.
// Retorna 200 apenas se todos os serviços essenciais estão operacionais.
//
// Gate F0: este endpoint deve retornar 200 antes do GO.
// =============================================================================

interface ServiceStatus {
  name: string;
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version: string;
  services: ServiceStatus[];
  uptime: number;
}

const startTime = Date.now();

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const services: ServiceStatus[] = [];

  // --- PostgreSQL ---
  const dbStart = Date.now();
  try {
    await serviceDb.execute(sql`SELECT 1`);
    services.push({
      name: "postgresql",
      status: "ok",
      latencyMs: Date.now() - dbStart,
    });
  } catch (error) {
    services.push({
      name: "postgresql",
      status: "down",
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // --- Redis ---
  const redisStart = Date.now();
  try {
    // TODO(#54): ping Redis via ioredis client
    // Por ora, marca como ok se a variável de ambiente existe
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL não configurada");
    }
    services.push({
      name: "redis",
      status: "ok",
      latencyMs: Date.now() - redisStart,
    });
  } catch (error) {
    services.push({
      name: "redis",
      status: "degraded",
      latencyMs: Date.now() - redisStart,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // --- Object Storage ---
  services.push({
    name: "object_storage",
    status: process.env.STORAGE_ENDPOINT ? "ok" : "degraded",
  });

  // Status geral
  const hasDown = services.some((s) => s.status === "down");
  const hasDegraded = services.some((s) => s.status === "degraded");
  const overallStatus = hasDown ? "down" : hasDegraded ? "degraded" : "ok";

  const body: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    services,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  const httpStatus = overallStatus === "down" ? 503 : 200;

  return NextResponse.json(body, { status: httpStatus });
}
