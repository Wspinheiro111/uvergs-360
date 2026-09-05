/**
 * UVERGS 360 — Seed de Desenvolvimento
 * Cria dados mínimos para rodar o sistema localmente.
 * 
 * NÃO usar em produção — production seed é separado.
 * 
 * Execução: node --experimental-vm-modules packages/db/seed/dev.seed.mjs
 */

import postgres from "postgres";
import { createHash, randomBytes, pbkdf2Sync } from "crypto";

const DB_URL = process.env.DATABASE_URL ??
  "postgresql://uvergs360:uvergs360_dev_secret@localhost:5432/uvergs360_dev";

const sql = postgres(DB_URL, { max: 3 });

// Hash de senha simples para dev (bcrypt não disponível sem npm)
// Em produção: usar bcrypt com custo 12+
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

async function seed() {
  console.log("🌱 Iniciando seed de desenvolvimento...\n");

  // ─── TENANT UVERGS ───
  console.log("  Criando tenant UVERGS...");
  const [tenant] = await sql`
    INSERT INTO tenants (slug, name, status, plan, contact_email, timezone)
    VALUES ('uvergs', 'UVERGS — União dos Vereadores do RS', 'active', 'enterprise', 'contato@uvergs.org.br', 'America/Sao_Paulo')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, slug
  `;
  console.log(`     ✅ Tenant: ${tenant.id} (${tenant.slug})`);

  // ─── TEMA DO TENANT ───
  await sql`
    INSERT INTO tenant_themes (tenant_id, primary_color, secondary_color, organization_full_name, tagline, certificate_signer_name, certificate_signer_title)
    VALUES (
      ${tenant.id},
      '#1a3a6e',
      '#c8a940',
      'União dos Vereadores do Estado do Rio Grande do Sul',
      'Fortalecendo o poder legislativo municipal gaúcho',
      'Presidente da UVERGS',
      'União dos Vereadores do Rio Grande do Sul'
    )
    ON CONFLICT (tenant_id) DO NOTHING
  `;
  console.log("     ✅ Tema criado");

  // ─── FLAGS VAL-LEGAL (todas desligadas) ───
  console.log("  Criando feature flags VAL-LEGAL...");
  const valLegalFlags = [
    { key: "GERADOR_INSTRUMENTO_FILIACAO",    description: "Gerador de minuta de Projeto de Resolução para filiação. Requer aprovação jurídica UVERGS." },
    { key: "KIT_CONTRATACAO_DIRETA",          description: "Kit de habilitação para contratação direta. Requer aprovação jurídica UVERGS." },
    { key: "NFS_E_EMISSAO",                   description: "Emissão de NFS-e. Requer configuração do provedor e validação fiscal." },
    { key: "RETENCOES_TRIBUTARIAS",           description: "Cálculo de retenções tributárias. Requer validação da contabilidade UVERGS." },
    { key: "SUPLENTE_COMUNICACAO_AUTOMATICA", description: "Comunicação automática a suplentes. Requer base legal definida pelo DPO/jurídico." },
    { key: "PORTAL_TITULAR_LGPD",             description: "Canal público de exercício de direitos do titular LGPD. Requer instrumentos de governança." },
  ];

  for (const flag of valLegalFlags) {
    await sql`
      INSERT INTO feature_flags (tenant_id, key, enabled, category, description)
      VALUES (${tenant.id}, ${flag.key}, false, 'val_legal', ${flag.description})
      ON CONFLICT (tenant_id, key) DO NOTHING
    `;
  }
  console.log(`     ✅ ${valLegalFlags.length} flags VAL-LEGAL criadas (todas desligadas)`);

  // ─── ROLES DE SISTEMA ───
  console.log("  Criando roles de sistema...");
  const systemRoles = [
    { name: "admin_global",          display: "Administrador Global",        require2fa: true  },
    { name: "presidency",            display: "Presidência/Diretoria",       require2fa: true  },
    { name: "financial",             display: "Financeiro/Contábil",         require2fa: true  },
    { name: "events",                display: "Eventos",                     require2fa: false },
    { name: "communication",         display: "Comunicação/Atendimento",     require2fa: false },
    { name: "legal_technical",       display: "Jurídico/Técnico",            require2fa: false },
    { name: "credentialing_operator",display: "Operador de Credenciamento",  require2fa: false },
    { name: "chamber_user",          display: "Usuário de Câmara",           require2fa: false },
    { name: "councilor",             display: "Vereador",                    require2fa: false },
    { name: "audit_read",            display: "Auditor/Consulta",            require2fa: true  },
  ];

  const createdRoles = {};
  for (const r of systemRoles) {
    const [role] = await sql`
      INSERT INTO roles (tenant_id, name, display_name, is_system, require_2fa)
      VALUES (${tenant.id}, ${r.name}, ${r.display}, true, ${r.require2fa})
      ON CONFLICT (tenant_id, name) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id, name
    `;
    createdRoles[r.name] = role.id;
  }
  console.log(`     ✅ ${systemRoles.length} roles criados`);

  // ─── USUÁRIO ADMIN ───
  console.log("  Criando usuário admin de desenvolvimento...");
  const adminPassword = hashPassword("Admin@360Dev!");
  const [admin] = await sql`
    INSERT INTO users (tenant_id, email, email_verified, display_name, password_hash, status, locale, timezone)
    VALUES (
      ${tenant.id},
      'admin@uvergs360.dev',
      true,
      'Administrador (Dev)',
      ${adminPassword},
      'active',
      'pt-BR',
      'America/Sao_Paulo'
    )
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;
  console.log(`     ✅ Admin: ${admin.email} / senha: Admin@360Dev!`);
  console.log(`        ⚠️  Trocar senha antes de usar em produção!`);

  // ─── VÍNCULO ADMIN → ROLE ───
  await sql`
    INSERT INTO user_roles (tenant_id, user_id, role_id)
    VALUES (${tenant.id}, ${admin.id}, ${createdRoles["admin_global"]})
    ON CONFLICT (user_id, role_id, chamber_id) DO NOTHING
  `;
  console.log("     ✅ Role admin_global vinculado");

  // ─── USUÁRIO DE EVENTOS (sem 2FA) ───
  const eventsPassword = hashPassword("Eventos@360Dev!");
  const [eventsUser] = await sql`
    INSERT INTO users (tenant_id, email, email_verified, display_name, password_hash, status)
    VALUES (${tenant.id}, 'eventos@uvergs360.dev', true, 'Gestor de Eventos (Dev)', ${eventsPassword}, 'active')
    ON CONFLICT (email, tenant_id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id, email
  `;
  await sql`
    INSERT INTO user_roles (tenant_id, user_id, role_id)
    VALUES (${tenant.id}, ${eventsUser.id}, ${createdRoles["events"]})
    ON CONFLICT (user_id, role_id, chamber_id) DO NOTHING
  `;
  console.log(`     ✅ Eventos: ${eventsUser.email} / senha: Eventos@360Dev!`);

  console.log("\n✅ Seed concluído!\n");
  console.log("  Credenciais de desenvolvimento:");
  console.log("  ┌─────────────────────────────────────────────┐");
  console.log("  │ admin@uvergs360.dev   Admin@360Dev!         │");
  console.log("  │ eventos@uvergs360.dev Eventos@360Dev!       │");
  console.log("  │ Tenant slug: uvergs                         │");
  console.log("  └─────────────────────────────────────────────┘");
}

seed()
  .then(() => sql.end())
  .catch(err => {
    console.error("Seed falhou:", err);
    sql.end();
    process.exit(1);
  });
