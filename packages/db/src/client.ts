import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

// =============================================================================
// UVERGS 360 — Database Client
// Dois clientes distintos:
//   1. appClient  → usa app_user role (RLS ativo, tenant isolation)
//   2. serviceClient → usa service_role (RLS bypass, para migrations/worker)
//
// NUNCA expor serviceClient via API pública ou frontend.
// =============================================================================

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida.");
}

// ---------------------------------------------------------------------------
// APP CLIENT — para a API (RLS ativo)
// Pool de conexões com pg-proxy para Neon serverless
// ---------------------------------------------------------------------------
const appSql = postgres(process.env.DATABASE_URL, {
  max: 20,                    // pool máximo
  idle_timeout: 20,           // fechar conexões ociosas após 20s
  connect_timeout: 10,        // timeout de conexão 10s
  ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  // Role da aplicação (RLS ativo, sem bypass)
  // Definido via SET ROLE no início de cada transação pelo middleware
  onnotice: () => {},         // suprimir notices em produção
});

export const db = drizzle(appSql, {
  schema,
  logger: process.env.NODE_ENV === "development",
});

// ---------------------------------------------------------------------------
// SERVICE CLIENT — para worker, migrations, jobs (RLS bypass)
// NUNCA expor via API pública
// ---------------------------------------------------------------------------
if (!process.env.DATABASE_URL_SERVICE) {
  // Em dev, aceita a mesma URL com role diferente setada via session
  // Em produção, deve ser uma URL separada com credenciais service_role
}

const serviceSql = postgres(
  process.env.DATABASE_URL_SERVICE ?? process.env.DATABASE_URL!,
  {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  }
);

export const serviceDb = drizzle(serviceSql, {
  schema,
  logger: false,
});

// ---------------------------------------------------------------------------
// HELPERS DE CONTEXTO — injetam tenant_id e user_id na sessão PostgreSQL
// Usados pelo middleware tRPC antes de cada query
// ---------------------------------------------------------------------------

/**
 * Cria uma transação com contexto de tenant e usuário injetado.
 * O RLS usa current_setting('app.current_tenant_id') para filtrar.
 *
 * SEMPRE usar este helper nas queries de aplicação — nunca query crua sem contexto.
 */
export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Injetar contexto de sessão (lido pelas políticas RLS)
    await tx.execute(
      `SET LOCAL app.current_tenant_id = '${tenantId}'`
    );
    await tx.execute(
      `SET LOCAL app.current_user_id = '${userId}'`
    );
    return callback(tx as unknown as typeof db);
  });
}

/**
 * Executa callback como service_role (RLS bypass).
 * Usar APENAS em contextos de worker, migrations ou jobs administrativos.
 * PROIBIDO chamar em handlers de API expostos ao usuário final.
 */
export async function withServiceRole<T>(
  callback: (db: typeof serviceDb) => Promise<T>
): Promise<T> {
  return callback(serviceDb);
}

// Exportar tipos úteis
export type Database = typeof db;
export type ServiceDatabase = typeof serviceDb;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
