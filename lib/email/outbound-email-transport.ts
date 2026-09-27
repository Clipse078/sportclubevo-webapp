/**
 * Provider-neutral outbound email transport (COMM-14).
 * Communication and other domains orchestrate; this module performs SMTP/API transport only.
 */

import {
  MailAttachmentPreflightError,
  MailConfigurationError,
  sendMail,
  type MailAttachment,
  type MailDeliveryResult,
} from "@/lib/email/mailer";

export type OutboundEmailPayload = {
  from?: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
  idempotencyKey?: string;
};

export type OutboundEmailTransportResult = {
  provider: "resend";
  messageId: string;
  from: string;
};

export class OutboundEmailTransportError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly permanent: boolean,
  ) {
    super(message);
    this.name = "OutboundEmailTransportError";
  }
}

function classifyTransportFailure(error: unknown): OutboundEmailTransportError {
  if (error instanceof MailConfigurationError) {
    return new OutboundEmailTransportError(
      "NOT_CONFIGURED",
      error.message,
      true,
    );
  }
  if (error instanceof MailAttachmentPreflightError) {
    return new OutboundEmailTransportError(
      "ATTACHMENT_TOO_LARGE",
      error.message,
      true,
    );
  }
  const message = error instanceof Error ? error.message : "Unknown transport failure";
  const lower = message.toLowerCase();
  const permanent =
    lower.includes("invalid") ||
    lower.includes("not found") ||
    lower.includes("blocked") ||
    lower.includes("validation");
  return new OutboundEmailTransportError(
    permanent ? "PERMANENT_PROVIDER_FAILURE" : "TRANSIENT_PROVIDER_FAILURE",
    message,
    permanent,
  );
}

export async function sendOutboundEmail(
  payload: OutboundEmailPayload,
): Promise<OutboundEmailTransportResult> {
  try {
    const result: MailDeliveryResult = await sendMail({
      from: payload.from,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
      idempotencyKey: payload.idempotencyKey,
    });
    return {
      provider: "resend",
      messageId: result.providerMessageId,
      from: result.from,
    };
  } catch (error) {
    throw classifyTransportFailure(error);
  }
}
