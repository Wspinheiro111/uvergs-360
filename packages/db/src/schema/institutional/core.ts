import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { tenants } from "../platform/tenant.ts";

const publicRef = pgSchema("public_ref");

export const municipalities = publicRef.table(
  "municipalities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ibgeCode: text("ibge_code").notNull(),
    treCode: text("tre_code"),
    name: text("name").notNull(),
    stateCode: text("state_code").notNull().default("RS"),
    mesoregion: text("mesoregion"),
    microregion: text("microregion"),
    population: integer("population"),
    censusYear: integer("census_year"),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    areaKm2: decimal("area_km2", { precision: 10, scale: 2 }),
    active: boolean("active").notNull().default(true),
  },
  (table) => [unique("municipalities_ibge_code_state_unique").on(table.ibgeCode, table.stateCode)]
);

export const chambers = pgTable(
  "chambers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    municipalityId: uuid("municipality_id").notNull().references(() => municipalities.id, { onDelete: "restrict" }),
    legalName: text("legal_name").notNull(),
    shortName: text("short_name"),
    cnpj: text("cnpj"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    websiteUrl: text("website_url"),
    transparencyUrl: text("transparency_url"),
    addressLine: text("address_line"),
    postalCode: text("postal_code"),
    status: text("status", { enum: ["active", "inactive", "pending"] }).notNull().default("active"),
    affiliationStatus: text("affiliation_status", { enum: ["affiliated", "prospect", "inactive"] }).notNull().default("prospect"),
    affiliatedAt: date("affiliated_at"),
    notes: text("notes"),
    dataQuality: text("data_quality", { enum: ["verified", "partial", "pending", "divergent"] }).notNull().default("pending"),
    contactUpdatedAt: timestamp("contact_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("chambers_tenant_municipality_unique").on(table.tenantId, table.municipalityId),
    unique("chambers_tenant_id_id_unique").on(table.tenantId, table.id),
    index("chambers_tenant_status_idx").on(table.tenantId, table.status),
  ]
);

export const persons = pgTable(
  "persons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    electoralName: text("electoral_name"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    publicEmail: boolean("public_email").notNull().default(false),
    publicPhone: boolean("public_phone").notNull().default(false),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    avatarUrl: text("avatar_url"),
    status: text("status", { enum: ["active", "inactive", "deceased"] }).notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("persons_tenant_id_id_unique").on(table.tenantId, table.id),
    index("persons_tenant_name_idx").on(table.tenantId, table.fullName),
  ]
);

export const mandates = pgTable(
  "mandates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    personId: uuid("person_id").notNull(),
    chamberId: uuid("chamber_id").notNull(),
    partyId: uuid("party_id"),
    electionId: uuid("election_id"),
    office: text("office", { enum: ["councilor", "president", "vice_president", "substitute"] }).notNull().default("councilor"),
    status: text("status", { enum: ["active", "licensed", "completed", "revoked"] }).notNull().default("active"),
    startedAt: date("started_at").notNull(),
    endedAt: date("ended_at"),
    legislatureLabel: text("legislature_label"),
    substituteRank: integer("substitute_rank"),
    electionStatus: text("election_status", { enum: ["elected", "alternate", "appointed", "unknown"] }),
    voteCount: integer("vote_count"),
    currentExercise: boolean("current_exercise").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mandates_tenant_status_idx").on(table.tenantId, table.status),
    index("mandates_chamber_idx").on(table.tenantId, table.chamberId, table.status),
    index("mandates_person_idx").on(table.tenantId, table.personId, table.startedAt),
  ]
);

export const institutionalSources = pgTable("institutional_sources", {
  id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  municipalityId: uuid("municipality_id").references(() => municipalities.id), chamberId: uuid("chamber_id"),
  sourceType: text("source_type", { enum: ["ibge","tse_open_data","divulgacand","chamber_portal","transparency_portal","manual"] }).notNull(),
  name: text("name").notNull(), url: text("url").notNull(), active: boolean("active").notNull().default(true),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }), lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const institutionalImports = pgTable("institutional_imports", {
  id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  sourceId: uuid("source_id").notNull().references(() => institutionalSources.id), requestedBy: uuid("requested_by"),
  status: text("status", { enum: ["queued","processing","review","applied","failed","cancelled"] }).notNull().default("queued"),
  electionYear: integer("election_year"), municipalityIbgeCode: text("municipality_ibge_code"),
  totalItems: integer("total_items").notNull().default(0), acceptedItems: integer("accepted_items").notNull().default(0),
  rejectedItems: integer("rejected_items").notNull().default(0), errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const institutionalImportItems = pgTable("institutional_import_items", {
  id: uuid("id").defaultRandom().primaryKey(), tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  importId: uuid("import_id").notNull().references(() => institutionalImports.id, { onDelete: "cascade" }),
  entityType: text("entity_type", { enum: ["chamber","person","mandate","contact"] }).notNull(), externalId: text("external_id"),
  operation: text("operation", { enum: ["create","update","conflict","unchanged"] }).notNull(),
  status: text("status", { enum: ["pending","accepted","rejected","applied"] }).notNull().default("pending"),
  confidence: integer("confidence").notNull().default(50), sourcePayload: jsonb("source_payload").notNull().default({}),
  proposedData: jsonb("proposed_data").notNull().default({}), reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
