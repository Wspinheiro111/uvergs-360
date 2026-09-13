import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { chambers, persons } from "../institutional/core.ts";
import { tenants } from "../platform/tenant.ts";

export const receivables = pgTable(
  "receivables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    chamberId: uuid("chamber_id"),
    personId: uuid("person_id"),
    registrationId: uuid("registration_id"),
    kind: text("kind", { enum: ["membership", "event", "service", "other"] }).notNull(),
    description: text("description").notNull(),
    competence: text("competence"),
    dueDate: date("due_date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["open", "overdue", "partial", "paid", "cancelled", "waived"] }).notNull().default("open"),
    externalReference: text("external_reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("receivables_tenant_id_id_unique").on(table.tenantId, table.id),
    unique("receivables_tenant_external_ref_unique").on(table.tenantId, table.externalReference),
    index("receivables_tenant_status_due_idx").on(table.tenantId, table.status, table.dueDate),
    foreignKey({ columns: [table.tenantId, table.chamberId], foreignColumns: [chambers.tenantId, chambers.id], name: "receivables_chamber_tenant_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.tenantId, table.personId], foreignColumns: [persons.tenantId, persons.id], name: "receivables_person_tenant_fk" }).onDelete("restrict"),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    receivableId: uuid("receivable_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    method: text("method", { enum: ["pix", "boleto", "bank_transfer", "card", "cash", "other"] }).notNull(),
    status: text("status", { enum: ["confirmed", "refunded", "reversed"] }).notNull().default("confirmed"),
    providerReference: text("provider_reference"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("payments_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey),
    index("payments_receivable_idx").on(table.tenantId, table.receivableId, table.paidAt),
    foreignKey({ columns: [table.tenantId, table.receivableId], foreignColumns: [receivables.tenantId, receivables.id], name: "payments_receivable_tenant_fk" }).onDelete("restrict"),
  ]
);

export const commitments = pgTable(
  "commitments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    supplierName: text("supplier_name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    dueDate: date("due_date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["planned", "approved", "paid", "cancelled"] }).notNull().default("planned"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("commitments_tenant_status_due_idx").on(table.tenantId, table.status, table.dueDate)]
);
