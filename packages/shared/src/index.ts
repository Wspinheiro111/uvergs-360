// =============================================================================
// UVERGS 360 — Shared Types & Utilities
// Usado por todos os pacotes do monorepo.
// Sem dependências de banco, framework ou runtime.
// =============================================================================

// ---------------------------------------------------------------------------
// ACCESS SCOPE — convenção de engenharia (§19 v4.2)
// Declarado em todo endpoint de coleção — CI falha sem declaração.
// ---------------------------------------------------------------------------

export type AccessScope =
  | "tenant"        // dados do próprio tenant (admin, financeiro)
  | "chamber"       // dados de uma câmara específica
  | "person"        // dados de uma pessoa específica (portal do vereador)
  | "global_reference"; // metadados globais (municípios, partidos, eleições)

// ---------------------------------------------------------------------------
// CORRELATION ID — rastreabilidade end-to-end
// ---------------------------------------------------------------------------

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// RESULT TYPE — evitar exceções não tipadas
// ---------------------------------------------------------------------------

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// PAGINATION
// ---------------------------------------------------------------------------

export interface PaginationInput {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ---------------------------------------------------------------------------
// DATE UTILS (sem dependências externas)
// ---------------------------------------------------------------------------

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

export function formatDateTimeBR(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// ---------------------------------------------------------------------------
// CURRENCY (centavos → reais formatado)
// ---------------------------------------------------------------------------

export function formatCurrencyBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ---------------------------------------------------------------------------
// CNPJ / CPF MASKS (exibição — nunca usar como validação de identidade)
// ---------------------------------------------------------------------------

export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

// ---------------------------------------------------------------------------
// ERRORS
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado: ${id}`, "NOT_FOUND", 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(action?: string) {
    super(
      action
        ? `Acesso negado para: ${action}`
        : "Acesso negado.",
      "FORBIDDEN",
      403
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super("Não autenticado.", "UNAUTHORIZED", 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 422, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}

export class FeatureFlagDisabledError extends AppError {
  constructor(flag: string) {
    super(
      `Funcionalidade não habilitada: ${flag}`,
      "FEATURE_FLAG_DISABLED",
      403
    );
  }
}
