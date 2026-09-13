import { foreignKey, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { tenants } from "../platform/tenant.ts";
import { users } from "../platform/auth.ts";

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    channel: text("channel", { enum: ["email", "whatsapp", "sms", "push"] }).notNull(),
    status: text("status", { enum: ["draft", "scheduled", "sending", "completed", "paused", "cancelled"] }).notNull().default("draft"),
    audience: text("audience", { enum: ["all", "affiliated_chambers", "prospects", "councilors", "event_attendees", "custom"] }).notNull().default("custom"),
    subject: text("subject"),
    content: text("content").notNull(),
    legalBasis: text("legal_basis", { enum: ["consent", "legitimate_interest", "contract", "public_interest"] }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("campaigns_tenant_id_id_unique").on(table.tenantId, table.id),
    index("campaigns_tenant_status_schedule_idx").on(table.tenantId, table.status, table.scheduledAt),
    foreignKey({ columns: [table.tenantId, table.createdBy], foreignColumns: [users.tenantId, users.id], name: "campaigns_created_by_tenant_fk" }).onDelete("restrict"),
  ]
);

export const campaignMessages = pgTable(
  "campaign_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    campaignId: uuid("campaign_id").notNull(),
    recipientName: text("recipient_name"),
    recipientAddress: text("recipient_address").notNull(),
    status: text("status", { enum: ["queued", "sent", "delivered", "read", "failed", "suppressed"] }).notNull().default("queued"),
    idempotencyKey: text("idempotency_key").notNull(),
    providerMessageId: text("provider_message_id"),
    failureCode: text("failure_code"),
    queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("campaign_messages_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey),
    index("campaign_messages_campaign_status_idx").on(table.tenantId, table.campaignId, table.status),
    foreignKey({ columns: [table.tenantId, table.campaignId], foreignColumns: [campaigns.tenantId, campaigns.id], name: "campaign_messages_campaign_tenant_fk" }).onDelete("cascade"),
  ]
);

export const contactPreferences = pgTable(
  "contact_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
    address: text("address").notNull(),
    channel: text("channel", { enum: ["email", "whatsapp", "sms", "push"] }).notNull(),
    status: text("status", { enum: ["subscribed", "unsubscribed", "bounced", "complained"] }).notNull().default("subscribed"),
    source: text("source"),
    consentEvidence: text("consent_evidence"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("contact_preferences_tenant_address_channel_unique").on(table.tenantId, table.address, table.channel),
    index("contact_preferences_tenant_status_idx").on(table.tenantId, table.status),
  ]
);
