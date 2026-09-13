import { auth } from "./auth";
import { logger } from "./logger";

type SqlClient = ReturnType<typeof import("postgres")>;
interface WriteContext { userId: string; tenantId: string; roles: string[]; }
type WriteResult<T> = { data: T; error: null } | { data: null; error: string };

export async function withAdminWrite<T>(
  allowedRoles: string[],
  mutation: (sql: SqlClient, context: WriteContext) => Promise<T>
): Promise<WriteResult<T>> {
  const session = await auth();
  const extended = session as typeof session & { tenantId?: string; roles?: string[] };
  const context = { userId: session?.user?.id, tenantId: extended?.tenantId, roles: extended?.roles ?? [] };
  if (!context.userId || !context.tenantId) return { data: null, error: "Sessão inválida. Entre novamente." };
  if (!context.roles.some((role) => allowedRoles.includes(role))) return { data: null, error: "Seu perfil não permite esta alteração." };

  const dbUrl = process.env.DATABASE_URL_SERVICE;
  if (!dbUrl) return { data: null, error: "Conexão segura de escrita não configurada." };
  const postgres = (await import("postgres")).default;
  const client = postgres(dbUrl, { max: 1, idle_timeout: 10, connect_timeout: 10 });
  try {
    const data = await client.begin(async (transaction) => {
      await transaction`SET LOCAL ROLE app_writer`;
      await transaction`SELECT set_config('app.current_tenant_id', ${context.tenantId}, true)`;
      await transaction`SELECT set_config('app.current_user_id', ${context.userId}, true)`;
      return mutation(transaction as unknown as SqlClient, context as WriteContext);
    });
    return { data: data as unknown as T, error: null };
  } catch (error) {
    logger.error("Falha na alteração administrativa", error);
    return { data: null, error: "Não foi possível concluir a alteração. Verifique se o título possui baixas vinculadas." };
  } finally {
    await client.end();
  }
}
