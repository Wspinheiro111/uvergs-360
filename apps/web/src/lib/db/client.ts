// Cliente de banco simplificado para o frontend
// O cliente completo fica em packages/db para o worker e migrations

export async function getDb() {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  const sql = postgres(url, { max: 5, idle_timeout: 20 });
  return { db: drizzle(sql), sql };
}
