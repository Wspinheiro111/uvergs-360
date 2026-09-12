import {
  boolean,
  date,
  decimal,
  index,
  integer,
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
    websiteUrl: text("website_url"),
    addressLine: text("address_line"),
    postalCode: text("postal_code"),
    status: text("status", { enum: ["active", "inactive", "pending"] }).notNull().default("active"),
    affiliationStatus: text("affiliation_status", { enum: ["affiliated", "prospect", "inactive"] }).notNull().default("prospect"),
    affiliatedAt: date("affiliated_at"),
    notes: text("notes"),
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
    email: text("email"),
    phone: text("phone"),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("mandates_tenant_status_idx").on(table.tenantId, table.status),
    index("mandates_chamber_idx").on(table.tenantId, table.chamberId, table.status),
    index("mandates_person_idx").on(table.tenantId, table.personId, table.startedAt),
  ]
);
