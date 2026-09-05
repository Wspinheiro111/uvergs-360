/**
 * UVERGS 360 — Email Adapter (Resend)
 * W9 Sistemas · v4.2 baseline
 *
 * Adapter desacoplado: a aplicação nunca chama Resend diretamente.
 * Toda comunicação de email passa por esta interface.
 *
 * Características:
 *   - Templates tipados com variáveis obrigatórias
 *   - Rastreamento de entrega via webhooks (F5)
 *   - Idempotência via idempotency key
 *   - Logs estruturados sem PII em texto plano
 *   - Throttle configurável (UsageMeter integrado na F5)
 */

import { Resend } from "resend";

// =============================================================================
// TIPOS
// =============================================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  replyTo?: string;
  /** Chave de idempotência — impede envio duplicado */
  idempotencyKey?: string;
  /** Correlation ID da requisição originadora */
  correlationId: string;
  /** tenant_id para rastreamento */
  tenantId: string;
}

// Templates disponíveis — tipagem garante que todas as variáveis são passadas
export type EmailTemplate =
  | {
      templateAlias: "uvergs360-event-registration-confirmation";
      variables: {
        EVENT_NAME: string;
        PARTICIPANT_NAME: string;
        EVENT_DATE: string;
        EVENT_LOCATION: string;
        REGISTRATION_CODE: string;
        CHAMBER_NAME: string;
        TOTAL_PARTICIPANTS: number;
        VERIFICATION_URL: string;
      };
    }
  | {
      templateAlias: "uvergs360-certificate-available";
      variables: {
        PARTICIPANT_NAME: string;
        EVENT_NAME: string;
        CERTIFICATE_CODE: string;
        VERIFICATION_URL: string;
        HOURS: number;
      };
    }
  | {
      templateAlias: "uvergs360-payment-pending";
      variables: {
        CHAMBER_NAME: string;
        EVENT_NAME: string;
        AMOUNT: string;
        DUE_DATE: string;
        PIX_KEY?: string;
        BOLETO_URL?: string;
        REGISTRATION_CODE: string;
      };
    }
  | {
      templateAlias: "uvergs360-2fa-code";
      variables: {
        USER_NAME: string;
        CODE: string;
        EXPIRES_IN_MINUTES: number;
      };
    }
  | {
      templateAlias: "uvergs360-membership-expiring";
      variables: {
        CHAMBER_NAME: string;
        EXPIRY_DATE: string;
        DAYS_REMAINING: number;
        RENEWAL_URL: string;
      };
    };

export interface SendTemplateEmailOptions extends SendEmailOptions {
  template: EmailTemplate;
}

export interface SendRawEmailOptions extends SendEmailOptions {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  messageId: string;
  status: "sent" | "queued";
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ResendEmailAdapter {
  private client: Resend;
  private fromAddress: string;
  private fromName: string;
  private replyTo: string;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY não configurada. Verificar .env antes de enviar emails."
      );
    }

    this.client = new Resend(process.env.RESEND_API_KEY);
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "noreply@uvergs.org.br";
    this.fromName = process.env.EMAIL_FROM_NAME ?? "UVERGS 360";
    this.replyTo = process.env.EMAIL_REPLY_TO ?? "contato@uvergs.org.br";
  }

  // ---------------------------------------------------------------------------
  // ENVIO POR TEMPLATE (método principal para emails transacionais)
  // ---------------------------------------------------------------------------

  async sendTemplate(options: SendTemplateEmailOptions): Promise<EmailResult> {
    const to = this.normalizeRecipients(options.to);

    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.fromName} <${this.fromAddress}>`,
        to,
        reply_to: options.replyTo ?? this.replyTo,
        // Templates gerenciados no dashboard Resend
        // Alias definido na criação do template
        headers: {
          "X-Idempotency-Key": options.idempotencyKey ?? options.correlationId,
          "X-Correlation-Id": options.correlationId,
          "X-Tenant-Id": options.tenantId,
        },
      } as any); // TODO(#101): tipagem completa de templates Resend

      if (error) {
        this.logError("send_template_error", options, error);
        throw new EmailSendError(error.message, error);
      }

      this.logSuccess("send_template_success", options, data?.id ?? "unknown");

      return {
        messageId: data?.id ?? "unknown",
        status: "sent",
      };
    } catch (err) {
      if (err instanceof EmailSendError) throw err;
      this.logError("send_template_unexpected_error", options, err);
      throw new EmailSendError(
        `Erro inesperado ao enviar email: ${String(err)}`,
        err
      );
    }
  }

  // ---------------------------------------------------------------------------
  // ENVIO RAW (para casos excepcionais — preferir templates)
  // ---------------------------------------------------------------------------

  async sendRaw(options: SendRawEmailOptions): Promise<EmailResult> {
    const to = this.normalizeRecipients(options.to);

    const { data, error } = await this.client.emails.send({
      from: `${this.fromName} <${this.fromAddress}>`,
      to,
      reply_to: options.replyTo ?? this.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        "X-Idempotency-Key": options.idempotencyKey ?? options.correlationId,
        "X-Correlation-Id": options.correlationId,
        "X-Tenant-Id": options.tenantId,
      },
    });

    if (error) {
      this.logError("send_raw_error", options, error);
      throw new EmailSendError(error.message, error);
    }

    return {
      messageId: data?.id ?? "unknown",
      status: "sent",
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS PRIVADOS
  // ---------------------------------------------------------------------------

  private normalizeRecipients(
    to: EmailRecipient | EmailRecipient[]
  ): string[] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map((r) =>
      r.name ? `${r.name} <${r.email}>` : r.email
    );
  }

  private logSuccess(
    event: string,
    options: SendEmailOptions,
    messageId: string
  ): void {
    // Log estruturado — SEM email do destinatário (PII)
    console.log(
      JSON.stringify({
        level: "info",
        event,
        correlationId: options.correlationId,
        tenantId: options.tenantId,
        messageId,
        recipientCount: Array.isArray(options.to)
          ? options.to.length
          : 1,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private logError(
    event: string,
    options: SendEmailOptions,
    error: unknown
  ): void {
    // Log estruturado — SEM email do destinatário (PII), SEM API key
    console.error(
      JSON.stringify({
        level: "error",
        event,
        correlationId: options.correlationId,
        tenantId: options.tenantId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      })
    );
  }
}

// =============================================================================
// ERRO TIPADO
// =============================================================================

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

// Singleton para uso na aplicação
let _emailAdapter: ResendEmailAdapter | null = null;

export function getEmailAdapter(): ResendEmailAdapter {
  if (!_emailAdapter) {
    _emailAdapter = new ResendEmailAdapter();
  }
  return _emailAdapter;
}
