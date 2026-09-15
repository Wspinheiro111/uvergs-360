import { type AdminDataResult, withAdminRead } from "./admin-data";

// =============================================================================
// Base 360º — primeira peça real do módulo Relacionamento
// (docs/UVERGS_360_PRODUCT_SCOPE_V2.md, seção 2.1).
//
// REGRA DESTE ARQUIVO: toda coluna consultada aqui existe de verdade no
// schema (chambers/persons/mandates, migrations 0008 e 0015). Nenhum campo
// de CRM (engagement score, opportunity score, next best action, última
// interação) existe ainda no banco — por isso não aparecem aqui como dado,
// só como `null` explícito, e a UI deve mostrar "Ainda não calculado" para
// eles, nunca um número inventado.
// =============================================================================

const RELATIONSHIP_ROLES = ["admin_global", "presidency", "financial", "audit_read"];

export type MandateOffice = "councilor" | "president" | "vice_president" | "substitute";
export type MandateStatus = "active" | "licensed" | "completed" | "revoked";
export type ChamberDataQuality = "verified" | "partial" | "pending" | "divergent";

export interface Base360Row {
  personId: string;
  fullName: string;
  electoralName: string | null;
  chamberId: string;
  chamberName: string;
  municipalityName: string;
  office: MandateOffice;
  substituteRank: number | null;
  mandateStatus: MandateStatus;
  legislatureLabel: string | null;
  startedAt: Date;
  endedAt: Date | null;
  currentExercise: boolean;
  personStatus: "active" | "inactive" | "deceased";
  chamberDataQuality: ChamberDataQuality;
  emailMasked: string | null;
  phoneMasked: string | null;
  whatsappMasked: string | null;
  publicEmail: boolean;
  publicPhone: boolean;

  // Campos de CRM que o escopo v2 pede (score de engajamento, score de
  // oportunidade, próxima melhor ação, última interação) — nenhum existe
  // no banco ainda. Ficam explicitamente null: a UI mostra "Ainda não
  // calculado", nunca um valor inventado.
  engagementScore: null;
  opportunityScore: null;
  nextAction: null;
  lastInteractionAt: null;
}

export interface Base360Directory {
  rows: Base360Row[];
  totals: {
    totalPeople: number;
    activeMandates: number;
    substitutes: number;
    chambersRepresented: number;
  };
}

/** Mascara e-mail preservando domínio: "j***@camara.rs.gov.br". */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/** Mascara telefone/WhatsApp preservando DDD e os 2 últimos dígitos. */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "*".repeat(digits.length);
  const ddd = digits.slice(0, 2);
  const last = digits.slice(-2);
  return `(${ddd}) ${"*".repeat(digits.length - 4)}${last}`;
}

export async function loadBase360Directory(
  search: string,
  officeFilter: MandateOffice | "all"
): Promise<AdminDataResult<Base360Directory>> {
  return withAdminRead(RELATIONSHIP_ROLES, async (sql) => {
    const pattern = `%${search}%`;

    interface RawRow {
      personId: string;
      fullName: string;
      electoralName: string | null;
      chamberId: string;
      chamberName: string;
      municipalityName: string;
      office: MandateOffice;
      substituteRank: number | null;
      mandateStatus: MandateStatus;
      legislatureLabel: string | null;
      startedAt: Date;
      endedAt: Date | null;
      currentExercise: boolean;
      personStatus: "active" | "inactive" | "deceased";
      chamberDataQuality: ChamberDataQuality;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      publicEmail: boolean;
      publicPhone: boolean;
    }

    const rows = await sql<RawRow[]>`
      SELECT
        p.id AS "personId",
        p.full_name AS "fullName",
        p.electoral_name AS "electoralName",
        c.id AS "chamberId",
        COALESCE(c.short_name, c.legal_name) AS "chamberName",
        m.name AS "municipalityName",
        md.office AS "office",
        md.substitute_rank AS "substituteRank",
        md.status AS "mandateStatus",
        md.legislature_label AS "legislatureLabel",
        md.started_at AS "startedAt",
        md.ended_at AS "endedAt",
        md.current_exercise AS "currentExercise",
        p.status AS "personStatus",
        c.data_quality AS "chamberDataQuality",
        p.email AS "email",
        p.phone AS "phone",
        p.whatsapp AS "whatsapp",
        p.public_email AS "publicEmail",
        p.public_phone AS "publicPhone"
      FROM mandates md
      JOIN persons p ON p.tenant_id = md.tenant_id AND p.id = md.person_id AND p.deleted_at IS NULL
      JOIN chambers c ON c.tenant_id = md.tenant_id AND c.id = md.chamber_id
      JOIN public_ref.municipalities m ON m.id = c.municipality_id
      WHERE (${search.length === 0} OR p.full_name ILIKE ${pattern} OR p.electoral_name ILIKE ${pattern}
        OR c.legal_name ILIKE ${pattern} OR c.short_name ILIKE ${pattern} OR m.name ILIKE ${pattern})
        AND (${officeFilter === "all"} OR md.office = ${officeFilter})
      ORDER BY md.current_exercise DESC, p.full_name
      LIMIT 200
    `;

    const [totalsRow] = await sql<
      { totalPeople: number; activeMandates: number; substitutes: number; chambersRepresented: number }[]
    >`
      SELECT
        COUNT(DISTINCT p.id)::int AS "totalPeople",
        COUNT(*) FILTER (WHERE md.status = 'active')::int AS "activeMandates",
        COUNT(*) FILTER (WHERE md.office = 'substitute')::int AS "substitutes",
        COUNT(DISTINCT md.chamber_id)::int AS "chambersRepresented"
      FROM mandates md
      JOIN persons p ON p.tenant_id = md.tenant_id AND p.id = md.person_id AND p.deleted_at IS NULL
    `;

    const directoryRows: Base360Row[] = rows.map((row) => ({
      personId: row.personId,
      fullName: row.fullName,
      electoralName: row.electoralName,
      chamberId: row.chamberId,
      chamberName: row.chamberName,
      municipalityName: row.municipalityName,
      office: row.office,
      substituteRank: row.substituteRank,
      mandateStatus: row.mandateStatus,
      legislatureLabel: row.legislatureLabel,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      currentExercise: row.currentExercise,
      personStatus: row.personStatus,
      chamberDataQuality: row.chamberDataQuality,
      emailMasked: row.publicEmail ? row.email : maskEmail(row.email),
      phoneMasked: row.publicPhone ? row.phone : maskPhone(row.phone),
      whatsappMasked: row.publicPhone ? row.whatsapp : maskPhone(row.whatsapp),
      publicEmail: row.publicEmail,
      publicPhone: row.publicPhone,
      engagementScore: null,
      opportunityScore: null,
      nextAction: null,
      lastInteractionAt: null,
    }));

    return {
      rows: directoryRows,
      totals: totalsRow ?? { totalPeople: 0, activeMandates: 0, substitutes: 0, chambersRepresented: 0 },
    };
  });
}
