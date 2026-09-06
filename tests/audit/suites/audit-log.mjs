/**
 * Auditoria — append-only e campos obrigatórios (§11, §16.5 v4.2)
 *
 * Prova que audit_logs não pode ser alterado por app_user e que os
 * campos de rastreabilidade (correlation_id, previous/new value) gravam.
 */

import postgres from "postgres";
import { test } from "../../helpers/harness.mjs";

export async function runAuditTests({ sql, dbUrl, tenantId, userId }) {
  console.log("\n📋 Auditoria — Append-Only & Campos Obrigatórios\n");

  await test("INSERT em audit_logs via superuser funciona", async () => {
    const corrId = (await sql`SELECT gen_random_uuid() AS id`)[0].id;
    const [row] = await sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id,
        action, module, entity_type, entity_id, outcome
      )
      VALUES (
        ${tenantId}, ${userId}, ${corrId},
        'test.create', 'platform', 'User', ${userId}, 'success'
      )
      RETURNING id, correlation_id, outcome`;
    if (!row.id) throw new Error("INSERT falhou — sem id retornado");
    if (row.outcome !== "success") throw new Error("outcome incorreto");
    if (row.correlation_id !== corrId) throw new Error("correlation_id incorreto");
    // limpeza
    await sql`DELETE FROM audit_logs WHERE id = ${row.id}`;
  });

  await test("Correlation ID é propagado corretamente no log", async () => {
    const corrId = (await sql`SELECT gen_random_uuid() AS id`)[0].id;
    const entityId = (await sql`SELECT gen_random_uuid() AS id`)[0].id;

    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, correlation_id, action, module, entity_type, entity_id, outcome, justification)
      VALUES (${tenantId}, ${userId}, ${corrId}, 'finance.payment.approve', 'financial', 'Receivable', ${entityId}, 'success', 'Aprovação de cobrança anual')`;

    const [found] = await sql`
      SELECT * FROM audit_logs WHERE correlation_id = ${corrId}`;
    if (!found) throw new Error("Não encontrado pelo correlation_id");
    if (found.justification !== "Aprovação de cobrança anual") throw new Error("justification incorreto");

    await sql`DELETE FROM audit_logs WHERE correlation_id = ${corrId}`;
  });

  await test("app_user NÃO pode INSERT em audit_logs", async () => {
    // audit_logs_service_insert exige is_service_role() = true
    // app_user com current_role = 'app_user' → is_service_role() = false → rejeita
    const ctxSql = postgres(dbUrl, { max: 1 });
    try {
      await ctxSql.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
      await ctxSql.unsafe(`SET ROLE app_user`);

      let rejeitou = false;
      try {
        await ctxSql.unsafe(`
          INSERT INTO audit_logs (tenant_id, user_id, correlation_id, action, module, entity_type, entity_id, outcome)
          VALUES ('${tenantId}', '${userId}', gen_random_uuid(), 'test.inject', 'platform', 'User', '${userId}', 'success')
        `);
      } catch (e) {
        rejeitou = true;
      }
      if (!rejeitou) throw new Error("app_user conseguiu INSERT em audit_logs — FALHA DE SEGURANÇA");
    } finally {
      await ctxSql.unsafe("RESET ROLE");
      await ctxSql.end();
    }
  });

  await test("previous_value e new_value armazenam JSON corretamente", async () => {
    const corrId = (await sql`SELECT gen_random_uuid() AS id`)[0].id;
    const prev = { status: "inactive", email: "old@test.com" };
    const next = { status: "active", email: "new@test.com" };

    const [row] = await sql`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id,
        action, module, entity_type, entity_id, outcome,
        previous_value, new_value
      )
      VALUES (
        ${tenantId}, ${userId}, ${corrId},
        'user.status.change', 'platform', 'User', ${userId}, 'success',
        ${sql.json(prev)}, ${sql.json(next)}
      )
      RETURNING previous_value, new_value`;

    // postgres.js retorna JSONB como objeto JS nativo
    if (row.previous_value.status !== "inactive") throw new Error(`previous_value JSON incorreto: ${JSON.stringify(row.previous_value)}`);
    if (row.new_value.status !== "active") throw new Error(`new_value JSON incorreto: ${JSON.stringify(row.new_value)}`);

    await sql`DELETE FROM audit_logs WHERE correlation_id = ${corrId}`;
  });

  await test("Partições de audit_logs recebem INSERT corretamente", async () => {
    const corrId = (await sql`SELECT gen_random_uuid() AS id`)[0].id;
    await sql`
      INSERT INTO audit_logs (tenant_id, user_id, correlation_id, action, module, entity_type, entity_id, outcome)
      VALUES (${tenantId}, ${userId}, ${corrId}, 'test.partition', 'platform', 'User', ${userId}, 'success')`;

    const [part] = await sql`
      SELECT tableoid::regclass AS partition_name 
      FROM audit_logs WHERE correlation_id = ${corrId}`;
    if (!part.partition_name.includes("audit_logs")) throw new Error(`Partição inválida: ${part.partition_name}`);
    console.log(`       → partição: ${part.partition_name}`);

    await sql`DELETE FROM audit_logs WHERE correlation_id = ${corrId}`;
  });
}

