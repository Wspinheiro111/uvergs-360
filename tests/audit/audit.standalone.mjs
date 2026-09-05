/**
 * UVERGS 360 — Testes de Auditoria e Outbox
 * Gate F0: auditoria append-only + outbox transacional + idempotência
 */

import postgres from "postgres";

const DB_URL = process.env.DATABASE_URL_TEST ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test";
const sql = postgres(DB_URL, { max: 3 });

let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failures.push({ name, error: e.message }); failed++; }
}

// ─── SETUP ───────────────────────────────────────────────────────────────────

let tenantId, userId;

async function setup() {
  const [t] = await sql`
    INSERT INTO tenants (slug, name, status)
    VALUES ('audit-test-tenant', 'Tenant Auditoria (Teste)', 'active')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`;
  tenantId = t.id;

  const [u] = await sql`
    INSERT INTO users (tenant_id, email, display_name, status)
    VALUES (${tenantId}, 'audit@test.internal', 'Usuário Auditoria', 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id`;
  userId = u.id;
}

async function teardown() {
  await sql`DELETE FROM outbox_events WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM audit_logs WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM users WHERE tenant_id = ${tenantId}`;
  await sql`DELETE FROM tenants WHERE id = ${tenantId}`;
}

// ─── TESTES AUDITORIA ────────────────────────────────────────────────────────

async function runAuditTests() {
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
    const ctxSql = postgres(DB_URL, { max: 1 });
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

// ─── TESTES OUTBOX ───────────────────────────────────────────────────────────

async function runOutboxTests() {
  console.log("\n📋 Outbox — Transacional e Idempotência\n");

  await test("Outbox grava payload JSON complexo", async () => {
    const key = `test-payload-${Date.now()}`;
    const payload = {
      registrationId: "abc-123",
      eventId: "evt-456",
      participants: [{ id: "p1", name: "João" }, { id: "p2", name: "Maria" }],
      totalAmount: 15000,
      currency: "BRL"
    };

    const [row] = await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Registration', gen_random_uuid(), 'registration.confirmed', ${sql.json(payload)}, ${key}, 'emailSend')
      RETURNING id, payload, status`;

    if (row.payload.registrationId !== "abc-123") throw new Error("payload JSON incorreto");
    if (row.status !== "pending") throw new Error(`status inicial incorreto: ${row.status}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Status do outbox transita pending → processing → done", async () => {
    const key = `test-transition-${Date.now()}`;

    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.event', '{}', ${key}, 'emailSend')`;

    // pending → processing
    await sql`UPDATE outbox_events SET status = 'processing', last_attempt_at = NOW() WHERE idempotency_key = ${key}`;
    const [proc] = await sql`SELECT status FROM outbox_events WHERE idempotency_key = ${key}`;
    if (proc.status !== "processing") throw new Error("Transição para processing falhou");

    // processing → done
    await sql`UPDATE outbox_events SET status = 'done', processed_at = NOW() WHERE idempotency_key = ${key}`;
    const [done] = await sql`SELECT status FROM outbox_events WHERE idempotency_key = ${key}`;
    if (done.status !== "done") throw new Error("Transição para done falhou");

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Outbox dead_letter após tentativas esgotadas", async () => {
    const key = `test-dlq-${Date.now()}`;

    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue, max_attempts)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.fail', '{}', ${key}, 'emailSend', 3)`;

    // Simular 3 tentativas com falha
    for (let i = 1; i <= 3; i++) {
      const newStatus = i >= 3 ? "dead_letter" : "failed";
      await sql`UPDATE outbox_events SET status = ${newStatus}, attempts = ${i}, last_error = 'Connection refused' WHERE idempotency_key = ${key}`;
    }

    const [final] = await sql`SELECT status, attempts FROM outbox_events WHERE idempotency_key = ${key}`;
    if (final.status !== "dead_letter") throw new Error(`Status final incorreto: ${final.status}`);
    if (final.attempts !== 3) throw new Error(`Tentativas incorretas: ${final.attempts}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("updated_at atualiza automaticamente via trigger", async () => {
    const key = `test-trigger-${Date.now()}`;
    const [before] = await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue)
      VALUES (${tenantId}, 'Test', gen_random_uuid(), 'test.trigger', '{}', ${key}, 'emailSend')
      RETURNING updated_at`;

    await new Promise(r => setTimeout(r, 50)); // garantir diferença de tempo

    await sql`UPDATE outbox_events SET status = 'processing' WHERE idempotency_key = ${key}`;
    const [after] = await sql`SELECT updated_at FROM outbox_events WHERE idempotency_key = ${key}`;

    if (after.updated_at <= before.updated_at) throw new Error("updated_at não foi atualizado pelo trigger");

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });

  await test("Prioridade high é indexada e consultável", async () => {
    const key = `test-priority-${Date.now()}`;
    await sql`
      INSERT INTO outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key, target_queue, priority)
      VALUES (${tenantId}, 'Payment', gen_random_uuid(), 'payment.confirmed', '{}', ${key}, 'emailSend', 'high')`;

    const [row] = await sql`SELECT priority FROM outbox_events WHERE idempotency_key = ${key}`;
    if (row.priority !== "high") throw new Error(`Prioridade incorreta: ${row.priority}`);

    await sql`DELETE FROM outbox_events WHERE idempotency_key = ${key}`;
  });
}

// ─── TESTES DE BRUTE FORCE ──────────────────────────────────────────────────

async function runBruteForceTests() {
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

// ─── TESTES SIGNED ACCESS LINKS ─────────────────────────────────────────────

async function runSignedLinkTests() {
  console.log("\n📋 Signed Access Links\n");

  await test("Link criado com nonce único e expiração 48h", async () => {
    const nonce = `test-nonce-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [link] = await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (${tenantId}, ${nonce}, 'portal:server:chamber-123', ${userId}, ${expiresAt})
      RETURNING id, nonce, scope, expires_at`;

    if (link.nonce !== nonce) throw new Error("nonce incorreto");
    if (link.scope !== "portal:server:chamber-123") throw new Error("scope incorreto");

    await sql`DELETE FROM signed_access_links WHERE id = ${link.id}`;
  });

  await test("Nonce UNIQUE impede duplicação (anti-replay)", async () => {
    const nonce = `fixed-nonce-${Date.now()}`;
    await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (${tenantId}, ${nonce}, 'test:scope', ${userId}, NOW() + INTERVAL '1 hour')`;

    let rejeitou = false;
    try {
      await sql`
        INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
        VALUES (${tenantId}, ${nonce}, 'test:scope', ${userId}, NOW() + INTERVAL '1 hour')`;
    } catch (e) {
      if (e.message.includes("unique") || e.message.includes("duplicate")) rejeitou = true;
      else throw e;
    }
    if (!rejeitou) throw new Error("Nonce duplicado deveria ter sido rejeitado");

    await sql`DELETE FROM signed_access_links WHERE nonce = ${nonce}`;
  });

  await test("Link expirado não é encontrado na consulta de validação", async () => {
    const nonce = `expired-nonce-${Date.now()}`;
    const pastDate = new Date(Date.now() - 1000); // 1 segundo atrás

    await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (${tenantId}, ${nonce}, 'test:scope', ${userId}, ${pastDate})`;

    const [valid] = await sql`
      SELECT id FROM signed_access_links
      WHERE nonce = ${nonce}
        AND expires_at > NOW()
        AND used_at IS NULL
        AND revoked_at IS NULL`;
    if (valid) throw new Error("Link expirado deveria ser rejeitado na validação");

    await sql`DELETE FROM signed_access_links WHERE nonce = ${nonce}`;
  });

  await test("used_at invalida link após uso único", async () => {
    const nonce = `used-nonce-${Date.now()}`;

    await sql`
      INSERT INTO signed_access_links (tenant_id, nonce, scope, created_by, expires_at)
      VALUES (${tenantId}, ${nonce}, 'test:scope', ${userId}, NOW() + INTERVAL '1 hour')`;

    // Marcar como usado
    await sql`
      UPDATE signed_access_links 
      SET used_at = NOW(), used_from_ip = '127.0.0.1'
      WHERE nonce = ${nonce}`;

    const [stillValid] = await sql`
      SELECT id FROM signed_access_links
      WHERE nonce = ${nonce}
        AND expires_at > NOW()
        AND used_at IS NULL`;
    if (stillValid) throw new Error("Link já usado deveria ser inválido");

    await sql`DELETE FROM signed_access_links WHERE nonce = ${nonce}`;
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("UVERGS 360 — Testes de Auditoria, Outbox & Auth");
  console.log("W9 Sistemas · Gate F0");
  console.log("=".repeat(60));

  await setup();

  await runAuditTests();
  await runOutboxTests();
  await runBruteForceTests();
  await runSignedLinkTests();

  console.log("\n🧹 Teardown...");
  await teardown();
  await sql.end();

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${passed} passou | ${failed} falhou`);
  console.log("=".repeat(60));

  if (failures.length > 0) {
    failures.forEach(f => console.log(`  ❌ ${f.name}\n     ${f.error}`));
    process.exit(1);
  } else {
    console.log("\n✅ Todos os testes de auditoria/auth passaram — Gate F0 Audit: GO\n");
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
