/**
 * UVERGS 360 — Harness mínimo de testes standalone
 *
 * Extraído de tests/isolation/rls-isolation.standalone.mjs e
 * tests/audit/audit.standalone.mjs, que duplicavam este código.
 *
 * Por que existe: os testes de isolamento rodam com `node` puro, sem
 * framework, para poderem ser executados em qualquer ambiente que tenha
 * apenas Node e acesso ao banco — inclusive dentro de um container de CI
 * sem instalar Vitest.
 */

import postgres from "postgres";

// ─── Placar ──────────────────────────────────────────────────────────────

const state = { passed: 0, failed: 0, failures: [] };

export function resetScore() {
  state.passed = 0;
  state.failed = 0;
  state.failures = [];
}

export function getScore() {
  return { ...state, failures: [...state.failures] };
}

// ─── Runner ──────────────────────────────────────────────────────────────

/**
 * Executa um caso de teste. Captura a exceção, contabiliza e segue —
 * um teste que falha não derruba a suíte inteira.
 */
export async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    state.passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    state.failures.push({ name, error: err.message });
    state.failed++;
  }
}

// ─── Asserções ───────────────────────────────────────────────────────────

export function expect(val) {
  return {
    toBe(expected) {
      if (val !== expected) {
        throw new Error(
          `Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(val)}`
        );
      }
    },
    toEqual(expected) {
      if (JSON.stringify(val) !== JSON.stringify(expected)) {
        throw new Error(
          `Esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(val)}`
        );
      }
    },
    toHaveLength(len) {
      if (!Array.isArray(val)) {
        throw new Error(`Valor não é array: ${JSON.stringify(val)}`);
      }
      if (val.length !== len) {
        throw new Error(`Esperado length ${len}, recebido ${val.length}`);
      }
    },
  };
}

/**
 * Falha o teste se a promise NÃO rejeitar.
 * Usado nos testes de RLS: o esperado é que o PostgreSQL recuse a operação.
 */
export async function expectRejection(promiseFactory, mensagemSeNaoRejeitar) {
  let rejeitou = false;
  try {
    await promiseFactory();
  } catch {
    rejeitou = true;
  }
  if (!rejeitou) throw new Error(mensagemSeNaoRejeitar);
}

// ─── Contexto de sessão PostgreSQL (RLS) ─────────────────────────────────

/**
 * Abre uma conexão com tenant_id e user_id injetados na sessão e o role
 * trocado para app_user — reproduzindo exatamente o que o middleware da
 * aplicação faz antes de cada query.
 *
 * SET não aceita parâmetros bindados ($1), por isso a interpolação é
 * literal. Os valores são sempre UUIDs vindos do próprio banco.
 */
export function makeWithContext(dbUrl) {
  return async function withContext(tenantId, userId, fn) {
    const ctx = postgres(dbUrl, { max: 1 });
    try {
      await ctx.unsafe(`SET app.current_tenant_id = '${tenantId}'`);
      await ctx.unsafe(`SET app.current_user_id = '${userId}'`);
      await ctx.unsafe(`SET ROLE app_user`);
      return await fn(ctx);
    } finally {
      await ctx.unsafe(`RESET ROLE`);
      await ctx.end();
    }
  };
}

// ─── Relatório final ─────────────────────────────────────────────────────

export function reportAndExit(titulo, mensagemSucesso) {
  const { passed, failed, failures } = getScore();

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTADO: ${passed} passou | ${failed} falhou`);
  console.log("=".repeat(60));

  if (failures.length > 0) {
    console.log("\nFALHAS:");
    failures.forEach((f) => console.log(`  ❌ ${f.name}\n     ${f.error}`));
    process.exit(1);
  }

  console.log(`\n✅ ${mensagemSucesso}\n`);
  process.exit(0);
}

export function printHeader(titulo, subtitulo) {
  console.log("=".repeat(60));
  console.log(titulo);
  if (subtitulo) console.log(subtitulo);
  console.log("=".repeat(60));
}
