import type { Config } from "drizzle-kit";

// UVERGS 360 — Drizzle ORM Config
// Migrations versionadas sequencialmente: 0001_, 0002_, ...
// NUNCA alterar migration já aplicada em produção

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não definida. Configure no .env antes de rodar migrations."
  );
}

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Naming convention das migrations: 0001_nome_descritivo.sql
  migrations: {
    prefix: "sequential",
  },
  // Verificação estrita: falha se schema e banco divergem inesperadamente
  strict: true,
  verbose: true,
} satisfies Config;
