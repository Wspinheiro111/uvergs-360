import {
  boolean,
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
import { fileAssets } from "../platform/audit.ts";
import { tenants } from "../platform/tenant.ts";
import { users } from "../platform/auth.ts";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    type: text("type", { enum: ["course", "seminar", "congress", "meeting", "workshop", "other"] }).notNull().default("course"),
    status: text("status", { enum: ["draft", "published", "registration_open", "full", "in_progress", "completed", "cancelled"] }).notNull().default("draft"),
    format: text("format", { enum: ["in_person", "online", "hybrid"] }).notNull().default("in_person"),
    venueName: text("venue_name"),
    municipalityName: text("municipality_name"),
    addressLine: text("address_line"),
    onlineUrl: text("online_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    capacity: integer("capacity"),
    priceCents: integer("price_cents").notNull().default(0),
    workloadMinutes: integer("workload_minutes").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("events_tenant_slug_unique").on(table.tenantId, table.slug),
    unique("events_tenant_id_id_unique").on(table.tenantId, table.id),
    index("events_tenant_status_start_idx").on(table.tenantId, table.status, table.startsAt),
    foreignKey({ columns: [table.tenantId, table.createdBy], foreignColumns: [users.tenantId, users.id], name: "events_created_by_tenant_fk" }).onDelete("restrict"),
  ]
);

export const eventSessions = pgTable(
  "event_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    eventId: uuid("event_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    speakerName: text("speaker_name"),
    roomName: text("room_name"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("event_sessions_tenant_id_id_unique").on(table.tenantId, table.id),
    index("event_sessions_event_start_idx").on(table.tenantId, table.eventId, table.startsAt),
    foreignKey({ columns: [table.tenantId, table.eventId], foreignColumns: [events.tenantId, events.id], name: "event_sessions_event_tenant_fk" }).onDelete("cascade"),
  ]
);

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    eventId: uuid("event_id").notNull(),
    personId: uuid("person_id"),
    chamberId: uuid("chamber_id"),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    attendeePhone: text("attendee_phone"),
    status: text("status", { enum: ["pending", "confirmed", "waitlist", "cancelled", "attended", "no_show"] }).notNull().default("pending"),
    paymentStatus: text("payment_status", { enum: ["exempt", "pending", "paid", "refunded", "overdue"] }).notNull().default("pending"),
    amountCents: integer("amount_cents").notNull().default(0),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("registrations_tenant_event_email_unique").on(table.tenantId, table.eventId, table.attendeeEmail),
    unique("registrations_tenant_id_id_unique").on(table.tenantId, table.id),
    index("registrations_event_status_idx").on(table.tenantId, table.eventId, table.status),
    foreignKey({ columns: [table.tenantId, table.eventId], foreignColumns: [events.tenantId, events.id], name: "registrations_event_tenant_fk" }).onDelete("cascade"),
    foreignKey({ columns: [table.tenantId, table.personId], foreignColumns: [persons.tenantId, persons.id], name: "registrations_person_tenant_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.tenantId, table.chamberId], foreignColumns: [chambers.tenantId, chambers.id], name: "registrations_chamber_tenant_fk" }).onDelete("restrict"),
  ]
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    eventId: uuid("event_id").notNull(),
    registrationId: uuid("registration_id").notNull(),
    assetId: uuid("asset_id"),
    verificationCode: text("verification_code").notNull(),
    status: text("status", { enum: ["pending", "issued", "revoked"] }).notNull().default("pending"),
    workloadMinutes: integer("workload_minutes").notNull().default(0),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("certificates_tenant_registration_unique").on(table.tenantId, table.registrationId),
    unique("certificates_verification_code_unique").on(table.verificationCode),
    index("certificates_event_status_idx").on(table.tenantId, table.eventId, table.status),
    foreignKey({ columns: [table.tenantId, table.eventId], foreignColumns: [events.tenantId, events.id], name: "certificates_event_tenant_fk" }).onDelete("cascade"),
    foreignKey({ columns: [table.tenantId, table.registrationId], foreignColumns: [registrations.tenantId, registrations.id], name: "certificates_registration_tenant_fk" }).onDelete("restrict"),
    foreignKey({ columns: [table.tenantId, table.assetId], foreignColumns: [fileAssets.tenantId, fileAssets.id], name: "certificates_asset_tenant_fk" }).onDelete("restrict"),
  ]
);
