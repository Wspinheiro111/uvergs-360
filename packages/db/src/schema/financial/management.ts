import { boolean, date, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { tenants } from "../platform/tenant.ts";
import { commitments, receivables } from "./core.ts";

export const financialAccounts = pgTable("financial_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "checking", "savings", "investment"] }).notNull(),
  bankName: text("bank_name"),
  accountLast4: text("account_last4"),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("financial_accounts_tenant_id_id_unique").on(table.tenantId, table.id)]);

export const costCenters = pgTable("cost_centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("cost_centers_tenant_code_unique").on(table.tenantId, table.code), unique("cost_centers_tenant_id_id_unique").on(table.tenantId, table.id)]);

export const fundingProjects = pgTable("funding_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  sourceType: text("source_type", { enum: ["own", "public_partnership", "sponsorship", "donation", "grant"] }).notNull(),
  restrictedFunds: boolean("restricted_funds").notNull().default(false),
  startsAt: date("starts_at"),
  endsAt: date("ends_at"),
  status: text("status", { enum: ["planned", "active", "completed", "cancelled"] }).notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("funding_projects_tenant_code_unique").on(table.tenantId, table.code), unique("funding_projects_tenant_id_id_unique").on(table.tenantId, table.id)]);

export const accountingAccounts = pgTable("accounting_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  parentId: uuid("parent_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  nature: text("nature", { enum: ["asset", "liability", "equity", "revenue", "expense"] }).notNull(),
  postingAllowed: boolean("posting_allowed").notNull().default(true),
  active: boolean("active").notNull().default(true),
}, (table) => [
  unique("accounting_accounts_tenant_code_unique").on(table.tenantId, table.code),
  unique("accounting_accounts_tenant_id_id_unique").on(table.tenantId, table.id),
  foreignKey({ columns: [table.tenantId, table.parentId], foreignColumns: [table.tenantId, table.id], name: "accounting_accounts_parent_tenant_fk" }).onDelete("restrict"),
]);

export const counterparties = pgTable("counterparties", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  type: text("type", { enum: ["supplier", "partner", "sponsor", "donor", "employee", "other"] }).notNull(),
  name: text("name").notNull(),
  documentMasked: text("document_masked"),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("counterparties_tenant_id_id_unique").on(table.tenantId, table.id), index("counterparties_tenant_name_idx").on(table.tenantId, table.name)]);

export const payables = pgTable("payables", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  counterpartyId: uuid("counterparty_id").notNull(),
  commitmentId: uuid("commitment_id"),
  costCenterId: uuid("cost_center_id").notNull(),
  projectId: uuid("project_id"),
  accountingAccountId: uuid("accounting_account_id").notNull(),
  description: text("description").notNull(),
  documentNumber: text("document_number"),
  competence: text("competence"),
  dueDate: date("due_date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["draft", "pending_approval", "approved", "partial", "paid", "overdue", "cancelled"] }).notNull().default("draft"),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("payables_tenant_id_id_unique").on(table.tenantId, table.id),
  index("payables_tenant_status_due_idx").on(table.tenantId, table.status, table.dueDate),
  foreignKey({ columns: [table.tenantId, table.counterpartyId], foreignColumns: [counterparties.tenantId, counterparties.id], name: "payables_counterparty_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.commitmentId], foreignColumns: [commitments.tenantId, commitments.id], name: "payables_commitment_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.costCenterId], foreignColumns: [costCenters.tenantId, costCenters.id], name: "payables_cost_center_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.projectId], foreignColumns: [fundingProjects.tenantId, fundingProjects.id], name: "payables_project_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.accountingAccountId], foreignColumns: [accountingAccounts.tenantId, accountingAccounts.id], name: "payables_account_tenant_fk" }),
]);

export const financialTransactions = pgTable("financial_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  financialAccountId: uuid("financial_account_id").notNull(),
  receivableId: uuid("receivable_id"),
  payableId: uuid("payable_id"),
  costCenterId: uuid("cost_center_id").notNull(),
  projectId: uuid("project_id"),
  accountingAccountId: uuid("accounting_account_id").notNull(),
  type: text("type", { enum: ["inflow", "outflow", "transfer_in", "transfer_out"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["pending", "confirmed", "reversed"] }).notNull().default("confirmed"),
  idempotencyKey: text("idempotency_key").notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("financial_transactions_tenant_id_id_unique").on(table.tenantId, table.id),
  unique("financial_transactions_tenant_idempotency_unique").on(table.tenantId, table.idempotencyKey),
  index("financial_transactions_account_date_idx").on(table.tenantId, table.financialAccountId, table.occurredAt),
  foreignKey({ columns: [table.tenantId, table.financialAccountId], foreignColumns: [financialAccounts.tenantId, financialAccounts.id], name: "financial_transactions_bank_account_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.receivableId], foreignColumns: [receivables.tenantId, receivables.id], name: "financial_transactions_receivable_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.payableId], foreignColumns: [payables.tenantId, payables.id], name: "financial_transactions_payable_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.costCenterId], foreignColumns: [costCenters.tenantId, costCenters.id], name: "financial_transactions_cost_center_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.projectId], foreignColumns: [fundingProjects.tenantId, fundingProjects.id], name: "financial_transactions_project_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.accountingAccountId], foreignColumns: [accountingAccounts.tenantId, accountingAccounts.id], name: "financial_transactions_accounting_account_tenant_fk" }),
]);

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  year: integer("year").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status", { enum: ["draft", "approved", "closed"] }).notNull().default("draft"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("budgets_tenant_year_version_unique").on(table.tenantId, table.year, table.version), unique("budgets_tenant_id_id_unique").on(table.tenantId, table.id)]);

export const budgetLines = pgTable("budget_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  budgetId: uuid("budget_id").notNull(),
  accountingAccountId: uuid("accounting_account_id").notNull(),
  costCenterId: uuid("cost_center_id").notNull(),
  projectId: uuid("project_id"),
  month: integer("month").notNull(),
  plannedCents: integer("planned_cents").notNull(),
}, (table) => [
  unique("budget_lines_dimension_unique").on(table.tenantId, table.budgetId, table.accountingAccountId, table.costCenterId, table.projectId, table.month),
  foreignKey({ columns: [table.tenantId, table.budgetId], foreignColumns: [budgets.tenantId, budgets.id], name: "budget_lines_budget_tenant_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.tenantId, table.accountingAccountId], foreignColumns: [accountingAccounts.tenantId, accountingAccounts.id], name: "budget_lines_account_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.costCenterId], foreignColumns: [costCenters.tenantId, costCenters.id], name: "budget_lines_cost_center_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.projectId], foreignColumns: [fundingProjects.tenantId, fundingProjects.id], name: "budget_lines_project_tenant_fk" }),
]);

export const bankStatementEntries = pgTable("bank_statement_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  financialAccountId: uuid("financial_account_id").notNull(),
  externalId: text("external_id").notNull(),
  postedAt: date("posted_at").notNull(),
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: ["unmatched", "matched", "ignored"] }).notNull().default("unmatched"),
  transactionId: uuid("transaction_id"),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("bank_statement_entries_tenant_account_external_unique").on(table.tenantId, table.financialAccountId, table.externalId),
  index("bank_statement_entries_tenant_status_idx").on(table.tenantId, table.status, table.postedAt),
  foreignKey({ columns: [table.tenantId, table.financialAccountId], foreignColumns: [financialAccounts.tenantId, financialAccounts.id], name: "bank_statement_entries_account_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.transactionId], foreignColumns: [financialTransactions.tenantId, financialTransactions.id], name: "bank_statement_entries_transaction_tenant_fk" }),
]);

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  transactionId: uuid("transaction_id"),
  entryDate: date("entry_date").notNull(),
  memo: text("memo").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id"),
  status: text("status", { enum: ["draft", "posted", "reversed"] }).notNull().default("draft"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("journal_entries_tenant_id_id_unique").on(table.tenantId, table.id),
  index("journal_entries_tenant_date_idx").on(table.tenantId, table.entryDate),
  foreignKey({ columns: [table.tenantId, table.transactionId], foreignColumns: [financialTransactions.tenantId, financialTransactions.id], name: "journal_entries_transaction_tenant_fk" }),
]);

export const journalLines = pgTable("journal_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "restrict" }),
  entryId: uuid("entry_id").notNull(),
  accountingAccountId: uuid("accounting_account_id").notNull(),
  costCenterId: uuid("cost_center_id"),
  projectId: uuid("project_id"),
  debitCents: integer("debit_cents").notNull().default(0),
  creditCents: integer("credit_cents").notNull().default(0),
  memo: text("memo"),
}, (table) => [
  index("journal_lines_entry_idx").on(table.tenantId, table.entryId),
  foreignKey({ columns: [table.tenantId, table.entryId], foreignColumns: [journalEntries.tenantId, journalEntries.id], name: "journal_lines_entry_tenant_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.tenantId, table.accountingAccountId], foreignColumns: [accountingAccounts.tenantId, accountingAccounts.id], name: "journal_lines_account_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.costCenterId], foreignColumns: [costCenters.tenantId, costCenters.id], name: "journal_lines_cost_center_tenant_fk" }),
  foreignKey({ columns: [table.tenantId, table.projectId], foreignColumns: [fundingProjects.tenantId, fundingProjects.id], name: "journal_lines_project_tenant_fk" }),
]);
