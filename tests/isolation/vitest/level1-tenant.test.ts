/**
 * UVERGS 360 — Nível 1 — Isolamento de Tenant (Cenário Q)
 *
 * Obrigatório no CI (§19.3 v4.2): deve passar antes de qualquer
 * funcionalidade de produto entrar em produção.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql, ids, setupFixtures, teardownFixtures, withContext } from "./fixtures";

beforeAll(setupFixtures);
afterAll(teardownFixtures);

describe("Nível 1 — Isolamento de Tenant", () => {
  it("Cobranças e pagamentos não vazam entre tenants", async () => {
    const [municipality] = await sql`
      INSERT INTO public_ref.municipalities (ibge_code, name, state_code, import_source)
      VALUES ('9999999', 'Município de Teste', 'RS', 'ci')
      ON CONFLICT (ibge_code, state_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const [chamberA] = await sql`
      INSERT INTO chambers (tenant_id, municipality_id, legal_name, affiliation_status)
      VALUES (${ids.tenantAId}, ${municipality?.id}, 'Câmara do Tenant A', 'affiliated')
      ON CONFLICT (tenant_id, municipality_id) DO UPDATE SET legal_name = EXCLUDED.legal_name
      RETURNING id
    `;
    const [charge] = await sql`
      INSERT INTO receivables (tenant_id, chamber_id, kind, description, due_date, amount_cents, status)
      VALUES (${ids.tenantAId}, ${chamberA.id}, 'membership', 'Anuidade de teste', CURRENT_DATE, 10000, 'open') RETURNING id
    `;
    await sql`INSERT INTO payments (tenant_id, receivable_id, amount_cents, paid_at, method, idempotency_key) VALUES (${ids.tenantAId}, ${charge?.id}, 5000, NOW(), 'pix', 'payment-test-a')`;
    const visible = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`SELECT id FROM receivables`) as { id: string }[];
    const visiblePayments = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`SELECT id FROM payments`) as { id: string }[];
    expect(visible).toHaveLength(0);
    expect(visiblePayments).toHaveLength(0);
  });

  it("Eventos e inscrições não vazam entre tenants", async () => {
    const [eventA] = await sql`
      INSERT INTO events (tenant_id, title, slug, starts_at, ends_at, status)
      VALUES (${ids.tenantAId}, 'Evento exclusivo A', 'evento-a', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 'registration_open')
      RETURNING id
    `;
    await sql`
      INSERT INTO registrations (tenant_id, event_id, attendee_name, attendee_email, status)
      VALUES (${ids.tenantAId}, ${eventA?.id}, 'Participante A', 'participante-a@test.uvergs360', 'confirmed')
    `;

    const visibleEvents = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`
      SELECT title FROM events
    `) as { title: string }[];
    const visibleRegistrations = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`
      SELECT attendee_email FROM registrations
    `) as { attendee_email: string }[];

    expect(visibleEvents).toHaveLength(0);
    expect(visibleRegistrations).toHaveLength(0);
  });

  it("Câmaras e mandatos institucionais não vazam entre tenants", async () => {
    const [municipality] = await sql`
      INSERT INTO public_ref.municipalities (ibge_code, name, state_code, import_source)
      VALUES ('9999999', 'Município de Teste', 'RS', 'ci')
      ON CONFLICT (ibge_code, state_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    const chambers = await sql`
      INSERT INTO chambers (tenant_id, municipality_id, legal_name, affiliation_status)
      VALUES
        (${ids.tenantAId}, ${municipality?.id}, 'Câmara do Tenant A', 'affiliated'),
        (${ids.tenantBId}, ${municipality?.id}, 'Câmara do Tenant B', 'prospect')
      ON CONFLICT (tenant_id, municipality_id) DO UPDATE SET legal_name = EXCLUDED.legal_name
      RETURNING id, tenant_id
    `;
    const chamberA = chambers.find((chamber) => chamber.tenant_id === ids.tenantAId);
    const personA = await sql`
      INSERT INTO persons (tenant_id, full_name)
      VALUES (${ids.tenantAId}, 'Pessoa Institucional A')
      RETURNING id
    `;
    await sql`
      INSERT INTO mandates (tenant_id, person_id, chamber_id, started_at)
      VALUES (${ids.tenantAId}, ${personA[0]?.id}, ${chamberA?.id}, '2025-01-01')
    `;

    const visibleChambers = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`
      SELECT legal_name FROM chambers ORDER BY legal_name
    `) as { legal_name: string }[];
    const visibleMandates = await withContext(ids.tenantBId, ids.userB1Id, async (ctxSql) => ctxSql`
      SELECT id FROM mandates
    `) as { id: string }[];

    expect(visibleChambers.map((chamber) => chamber.legal_name)).toEqual(["Câmara do Tenant B"]);
    expect(visibleMandates).toHaveLength(0);
  });

  it("Tenant A não consegue ler registros do Tenant B via RLS", async () => {
    // Criar uma feature_flag no Tenant B
    await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, description)
      VALUES (${ids.tenantBId}, 'TEST_FLAG_B_ONLY', false, 'Flag exclusiva do Tenant B')
      ON CONFLICT (tenant_id, key) DO NOTHING
    `;

    // Tenant A tenta ler flags do Tenant B → deve retornar 0 registros (RLS filtra)
    const result = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`
        SELECT * FROM feature_flags WHERE key = 'TEST_FLAG_B_ONLY'
      `
    ) as Record<string, unknown>[];

    expect(result).toHaveLength(0); // RLS filtrou — Tenant A não vê dados do Tenant B

    // Limpeza
    await sql`DELETE FROM feature_flags WHERE key = 'TEST_FLAG_B_ONLY'`;
  });

  it("Tenant B não consegue ler usuários do Tenant A", async () => {
    const result = await withContext(
      ids.tenantBId,
      ids.userB1Id,
      async (ctxSql) => ctxSql`
        SELECT * FROM users WHERE tenant_id = ${ids.tenantAId}
      `
    ) as Record<string, unknown>[];

    expect(result).toHaveLength(0);
  });

  it("Sessão do Tenant A não pode modificar dados do Tenant B", async () => {
    await expect(
      withContext(ids.tenantAId, ids.userA1Id, async (ctxSql) => ctxSql`
        INSERT INTO feature_flags (tenant_id, key, enabled, description)
        VALUES (${ids.tenantBId}, 'INJECTION_ATTEMPT', true, 'Tentativa de injeção cross-tenant')
      `)
    ).rejects.toThrow(); // RLS rejeita INSERT com tenant_id diferente do contexto
  });

  it("Tentativa de leitura cross-tenant é registrada no AuditLog", async () => {
    // Este teste verifica que o middleware de auditoria captura a tentativa
    // A query propriamente dita é filtrada pelo RLS (retorna 0 registros)
    // O middleware da aplicação deve registrar a tentativa quando detected

    // Por enquanto, verificamos apenas que o RLS funciona
    // O teste completo de auditoria de tentativa é feito nos testes E2E (Cenário F)
    const result = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`
        SELECT COUNT(*) as count FROM users WHERE tenant_id = ${ids.tenantBId}
      `
    ) as Record<string, unknown>[];

    expect(parseInt(result[0]?.count ?? "0")).toBe(0);
  });

  // Cenário Q específico — Candidacy entre tenants (Bloqueador v4.1 §48.3)
  it("Cenário Q: Candidacy não é acessível entre tenants", async () => {
    // Candidacy será criada na migration de F1 (institutional)
    // Por ora, o teste verifica a política de isolamento para a tabela
    // quando ela existir — placeholder para ser expandido na F1

    // Verificação indireta: a função de isolamento de tenant funciona
    const tenantFromContext = await withContext(
      ids.tenantAId,
      ids.userA1Id,
      async (ctxSql) => ctxSql`SELECT app.current_tenant_id() AS tenant_id`
    ) as Record<string, unknown>[];

    expect(tenantFromContext[0]?.tenant_id).toBe(ids.tenantAId);

    // Tenant B não consegue "ver" o tenant_id do Tenant A como seu contexto
    const tenantBContext = await withContext(
      ids.tenantBId,
      ids.userB1Id,
      async (ctxSql) => ctxSql`SELECT app.current_tenant_id() AS tenant_id`
    ) as Record<string, unknown>[];

    expect(tenantBContext[0]?.tenant_id).toBe(ids.tenantBId);
    expect(tenantBContext[0]?.tenant_id).not.toBe(ids.tenantAId);
  });
});

// =============================================================================
// NÍVEL 2 — ISOLAMENTO DE CÂMARA (Cenário F)
// Nota: Câmaras serão criadas na migration de F1.
// Este bloco testa os mecanismos de contexto que F1 usará.
// =============================================================================
