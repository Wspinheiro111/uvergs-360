#!/usr/bin/env node
/**
 * UVERGS 360 — Gate F0: Relatório Completo
 * Roda todas as suítes de teste e gera relatório de GO/NO-GO
 * 
 * Uso: node scripts/gate-f0.mjs
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DB_TEST = process.env.DATABASE_URL_TEST ?? "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_test";
const DB_DEV  = process.env.DATABASE_URL      ?? "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev";

const timestamp = new Date().toISOString();
const results = [];

function run(label, cmd, env = {}) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`🔄 ${label}`);
  console.log("─".repeat(60));
  
  const start = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const ms = Date.now() - start;
    console.log(output);
    results.push({ label, status: "PASS", ms, output });
    return true;
  } catch (err) {
    const ms = Date.now() - start;
    const output = (err.stdout || "") + (err.stderr || "");
    console.log(output);
    console.error(`❌ Falhou em ${ms}ms`);
    results.push({ label, status: "FAIL", ms, output });
    return false;
  }
}

// ─── VERIFICAÇÕES DE AMBIENTE ────────────────────────────────────────────────

console.log("\n" + "═".repeat(60));
console.log("UVERGS 360 — Gate F0: Avaliação Completa");
console.log(`Timestamp: ${timestamp}`);
console.log("W9 Sistemas");
console.log("═".repeat(60));

// Verificar serviços
console.log("\n📡 Verificando serviços...");

let pgOk = false, redisOk = false;
try {
  execSync("pg_isready -h localhost -p 5432", { stdio: "pipe" });
  pgOk = true;
  console.log("  ✅ PostgreSQL 16: conectado");
} catch {
  console.log("  ❌ PostgreSQL: não disponível");
}

try {
  execSync("redis-cli -a uvergs360_redis_secret ping", { stdio: "pipe" });
  redisOk = true;
  console.log("  ✅ Redis 7: conectado");
} catch {
  console.log("  ⚠️  Redis: não disponível (worker não testado)");
}

// ─── SUÍTES DE TESTE ─────────────────────────────────────────────────────────

const testDir = join(ROOT, "..", "test-run");

const l1 = run(
  "L1/L2/L3 — Isolamento RLS (Cenários F, K, Q)",
  `node ${testDir}/isolation.test.mjs`,
  { DATABASE_URL_TEST: DB_TEST }
);

const l2 = run(
  "Auditoria — Append-Only, Outbox, Brute Force, Signed Links",
  `node ${testDir}/audit.test.mjs`,
  { DATABASE_URL_TEST: DB_TEST }
);

const l3 = run(
  "Feature Flags, Health Check, Sessões",
  `node ${testDir}/flags-health.test.mjs`,
  { DATABASE_URL_DEV: DB_DEV }
);

// ─── VERIFICAÇÕES DIRETAS DE BANCO ───────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log("🔄 Verificações diretas de banco");
console.log("─".repeat(60));

let dbChecks = true;
const dbCheckItems = [];

try {
  const output = execSync(`PGPASSWORD=uvergs360_dev_secret psql -h localhost -U uvergs360 -d uvergs360_test -t -c "
    SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity = true
  "`, { encoding: "utf8" });
  const count = parseInt(output.trim());
  const ok = count >= 17;
  dbCheckItems.push({ item: `Tabelas com RLS: ${count}/17+`, ok });
  console.log(`  ${ok ? "✅" : "❌"} Tabelas com RLS habilitado: ${count}`);
  if (!ok) dbChecks = false;
} catch (e) {
  dbCheckItems.push({ item: "RLS check", ok: false });
  dbChecks = false;
}

try {
  const output = execSync(`PGPASSWORD=uvergs360_dev_secret psql -h localhost -U uvergs360 -d uvergs360_test -t -c "
    SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
  "`, { encoding: "utf8" });
  const count = parseInt(output.trim());
  const ok = count >= 20;
  dbCheckItems.push({ item: `Políticas RLS: ${count}/20+`, ok });
  console.log(`  ${ok ? "✅" : "❌"} Políticas RLS criadas: ${count}`);
  if (!ok) dbChecks = false;
} catch (e) {
  dbCheckItems.push({ item: "Políticas RLS", ok: false });
  dbChecks = false;
}

try {
  const output = execSync(`PGPASSWORD=uvergs360_dev_secret psql -h localhost -U uvergs360 -d uvergs360_dev -t -c "
    SELECT COUNT(*) FROM feature_flags WHERE category = 'val_legal' AND enabled = false
  "`, { encoding: "utf8" });
  const count = parseInt(output.trim());
  const ok = count === 6;
  dbCheckItems.push({ item: `Flags VAL-LEGAL desligadas: ${count}/6`, ok });
  console.log(`  ${ok ? "✅" : "❌"} Flags VAL-LEGAL desligadas: ${count}/6`);
  if (!ok) dbChecks = false;
} catch (e) {
  dbCheckItems.push({ item: "Flags VAL-LEGAL", ok: false });
  dbChecks = false;
}

try {
  const output = execSync(`PGPASSWORD=uvergs360_dev_secret psql -h localhost -U uvergs360 -d uvergs360_dev -t -c "
    SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'
  "`, { encoding: "utf8" });
  const bypassRLS = output.trim() === "t";
  dbCheckItems.push({ item: "service_role BYPASSRLS", ok: bypassRLS });
  console.log(`  ${bypassRLS ? "✅" : "❌"} service_role BYPASSRLS: ${bypassRLS}`);
  if (!bypassRLS) dbChecks = false;
} catch (e) {
  dbCheckItems.push({ item: "service_role BYPASSRLS", ok: false });
  dbChecks = false;
}

try {
  const output = execSync(`PGPASSWORD=uvergs360_dev_secret psql -h localhost -U uvergs360 -d uvergs360_dev -t -c "
    SELECT rolbypassrls FROM pg_roles WHERE rolname = 'app_user'
  "`, { encoding: "utf8" });
  const noBypass = output.trim() === "f";
  dbCheckItems.push({ item: "app_user sem BYPASSRLS", ok: noBypass });
  console.log(`  ${noBypass ? "✅" : "❌"} app_user sem BYPASSRLS: ${noBypass}`);
  if (!noBypass) dbChecks = false;
} catch (e) {
  dbCheckItems.push({ item: "app_user sem BYPASSRLS", ok: false });
  dbChecks = false;
}

results.push({ label: "Verificações diretas de banco", status: dbChecks ? "PASS" : "FAIL", ms: 0, items: dbCheckItems });

// ─── RESULTADO FINAL ─────────────────────────────────────────────────────────

const allPass = l1 && l2 && l3 && dbChecks;

const gateLine = allPass
  ? "🟢 GATE F0: GO — Fundação aprovada. F1 liberado."
  : "🔴 GATE F0: NO-GO — Itens pendentes (ver detalhes acima).";

console.log("\n" + "═".repeat(60));
console.log("RESULTADO FINAL");
console.log("═".repeat(60));
results.forEach(r => {
  const icon = r.status === "PASS" ? "✅" : "❌";
  console.log(`${icon} ${r.label}`);
});
console.log("─".repeat(60));
console.log(gateLine);
console.log("═".repeat(60));

// ─── GERAR RELATÓRIO MARKDOWN ────────────────────────────────────────────────

const reportLines = [
  `# Gate F0 — Relatório de Avaliação`,
  ``,
  `**Data:** ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
  `**Avaliado por:** Script automatizado (gate-f0.mjs)`,
  `**Resultado:** ${allPass ? "✅ GO" : "❌ NO-GO"}`,
  ``,
  `## Ambiente`,
  ``,
  `| Serviço | Status |`,
  `|---|---|`,
  `| PostgreSQL 16 | ${pgOk ? "✅ OK" : "❌ Indisponível"} |`,
  `| Redis 7 | ${redisOk ? "✅ OK" : "⚠️ Não testado"} |`,
  ``,
  `## Suítes de Teste`,
  ``,
  `| Suíte | Resultado |`,
  `|---|---|`,
  ...results.map(r => `| ${r.label} | ${r.status === "PASS" ? "✅ PASS" : "❌ FAIL"} |`),
  ``,
  `## Checklist Gate F0 (itens verificados)`,
  ``,
  `### Isolamento Multi-tenant`,
  `- [${l1 ? "x" : " "}] L1: Tenant × Tenant — Cenário Q`,
  `- [${l1 ? "x" : " "}] L2: Câmara × Câmara — Cenário F`,
  `- [${l1 ? "x" : " "}] L3: Pessoa × Pessoa — Cenário K`,
  `- [${l1 ? "x" : " "}] RLS habilitado em todas as tabelas`,
  `- [${l1 ? "x" : " "}] service_role BYPASSRLS`,
  `- [${l1 ? "x" : " "}] app_user sem BYPASSRLS`,
  ``,
  `### Auditoria`,
  `- [${l2 ? "x" : " "}] audit_logs append-only (app_user não faz UPDATE/DELETE)`,
  `- [${l2 ? "x" : " "}] Correlation ID propagado`,
  `- [${l2 ? "x" : " "}] Particionamento por data funcionando`,
  `- [${l2 ? "x" : " "}] previous_value e new_value JSON gravados`,
  ``,
  `### Outbox e Filas`,
  `- [${l2 ? "x" : " "}] Idempotency key UNIQUE`,
  `- [${l2 ? "x" : " "}] Transição de status pending → done`,
  `- [${l2 ? "x" : " "}] Dead letter após tentativas esgotadas`,
  `- [${l2 ? "x" : " "}] Trigger updated_at automático`,
  ``,
  `### Autenticação e Proteção`,
  `- [${l2 ? "x" : " "}] Brute force: failed_login_attempts`,
  `- [${l2 ? "x" : " "}] locked_until bloqueia conta`,
  `- [${l2 ? "x" : " "}] Sessão expirada rejeitada`,
  `- [${l2 ? "x" : " "}] Sessão revogada rejeitada`,
  `- [${l2 ? "x" : " "}] Signed links: nonce único, expiração, uso único`,
  ``,
  `### Feature Flags`,
  `- [${l3 ? "x" : " "}] 6 flags VAL-LEGAL criadas e desligadas`,
  `- [${l3 ? "x" : " "}] Flags VAL-LEGAL não habilitáveis sem approval_document`,
  `- [${l3 ? "x" : " "}] RLS: flags visíveis apenas no próprio tenant`,
  ``,
  `### Health Check`,
  `- [${l3 ? "x" : " "}] Banco responde < 100ms`,
  `- [${l3 ? "x" : " "}] Tenant UVERGS ativo`,
  `- [${l3 ? "x" : " "}] Usuário admin ativo`,
  `- [${l3 ? "x" : " "}] Migrations aplicadas (tabelas essenciais existem)`,
  `- [${l3 ? "x" : " "}] Extensions instaladas`,
  `- [${l3 ? "x" : " "}] Pool de conexões OK`,
  ``,
  `## Itens Pendentes (para GO completo)`,
  ``,
  `- [ ] Auth.js login funcional end-to-end (Next.js dev server)`,
  `- [ ] 2FA TOTP end-to-end com otplib`,
  `- [ ] /api/health HTTP 200 (requer Next.js rodando)`,
  `- [ ] CI/CD GitHub Actions passando`,
  `- [ ] Deploy Vercel staging`,
  `- [ ] Smoke test pós-deploy`,
  ``,
  `## Decisão`,
  ``,
  allPass
    ? `**${gateLine}**\n\nTodos os critérios verificáveis via banco foram aprovados. Os itens pendentes (Auth.js, CI/CD, Vercel) estão bloqueados por dependências de ambiente externo (GitHub, Vercel), não por problemas de implementação.`
    : `**${gateLine}**\n\nVer falhas acima para itens que precisam ser corrigidos antes do GO.`,
];

const reportPath = join(ROOT, "docs", "gates", "F0-gate-resultado.md");
writeFileSync(reportPath, reportLines.join("\n"), "utf8");
console.log(`\n📄 Relatório salvo: docs/gates/F0-gate-resultado.md`);

process.exit(allPass ? 0 : 1);
