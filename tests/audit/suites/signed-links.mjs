/**
 * Signed Access Links — nonce único, expiração e uso único (§13.2 v4.2)
 *
 * O link nunca concede acesso amplo: escopo restrito, expira em 48h
 * e o nonce é invalidado no primeiro uso (anti-replay).
 */

import { test } from "../../helpers/harness.mjs";

export async function runSignedLinkTests({ sql, tenantId, userId }) {
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

