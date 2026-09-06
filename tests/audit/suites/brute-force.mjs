/**
 * Proteção contra brute force no login
 *
 * failed_login_attempts, locked_until e o reset após sucesso.
 */

import { test } from "../../helpers/harness.mjs";

export async function runBruteForceTests({ sql, userId }) {
  console.log("\n📋 Proteção contra Brute Force\n");

  await test("failed_login_attempts é incrementável", async () => {
    const [initial] = await sql`SELECT failed_login_attempts FROM users WHERE id = ${userId}`;
    await sql`UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = NOW() WHERE id = ${userId}`;
    const [after] = await sql`SELECT failed_login_attempts FROM users WHERE id = ${userId}`;
    if (after.failed_login_attempts !== initial.failed_login_attempts + 1)
      throw new Error("Incremento de failed_login_attempts falhou");
    // Reset
    await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${userId}`;
  });

  await test("locked_until bloqueia conta temporariamente", async () => {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await sql`UPDATE users SET locked_until = ${lockUntil} WHERE id = ${userId}`;

    const [row] = await sql`
      SELECT id FROM users 
      WHERE id = ${userId} 
        AND (locked_until IS NULL OR locked_until <= NOW())
        AND status = 'active'`;
    if (row) throw new Error("Conta bloqueada deveria não retornar na consulta de login");

    // Reset
    await sql`UPDATE users SET locked_until = NULL WHERE id = ${userId}`;
  });

  await test("Reset após login bem-sucedido limpa contadores", async () => {
    await sql`UPDATE users SET failed_login_attempts = 8, locked_until = NULL, last_successful_login_at = NOW() WHERE id = ${userId}`;
    await sql`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ${userId}`;

    const [row] = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${userId}`;
    if (row.failed_login_attempts !== 0) throw new Error("Contador não foi zerado");
    if (row.locked_until !== null) throw new Error("locked_until não foi limpo");
  });
}

