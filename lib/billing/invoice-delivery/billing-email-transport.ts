import { sendMail, type MailAttachment, type MailDeliveryResult } from "@/lib/email/mailer";
import { sendInfomaniakBillingEmail } from "./billing-infomaniak-smtp-transport";
import { isInfomaniakBillingSmtpTransportSelected } from "./billing-email-transport-selection";
import {
  type BillingEmailDeliveryIntent,
  billingDeliveryDryRunDelayMs,
  shouldUseBillingDeliveryDryRunTransportForIntent,
} from "./billing-delivery-transport-mode";

export type BillingEmailTransportPayload = {
  from?: string;
  to: string;
  replyTo?: string;
  bcc?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
  idempotencyKey?: string;
  simulateFailure?: boolean;
  /** Defaults to normal (Preview dry-run). Only protected test delivery may opt into live transport. */
  deliveryIntent?: BillingEmailDeliveryIntent;
};

export type BillingEmailTransportResult = {
  provider: "resend" | "dry-run" | "infomaniak-smtp";
  messageId: string;
  from: string;
  /** Present when the outbound provider reports SMTP/API acceptance details. */
  acceptedRecipients?: string[];
  rejectedRecipients?: string[];
};

export class BillingEmailDryRunFailureError extends Error {
  constructor() {
    super("Billing delivery dry-run simulated failure.");
    this.name = "BillingEmailDryRunFailureError";
  }
}

export async function sendBillingEmail(
  payload: BillingEmailTransportPayload,
): Promise<BillingEmailTransportResult> {
  const deliveryIntent = payload.deliveryIntent ?? "normal";
  if (shouldUseBillingDeliveryDryRunTransportForIntent(deliveryIntent)) {
    const delayMs = billingDeliveryDryRunDelayMs();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (payload.simulateFailure) {
      throw new BillingEmailDryRunFailureError();
    }
    const from = payload.from?.trim() || "SportClubEvo Billing <dry-run@sportclubevo.test>";
    return {
      provider: "dry-run",
      messageId: `dry-run-${payload.idempotencyKey ?? "billing-invoice"}`,
      from,
    };
  }

  if (isInfomaniakBillingSmtpTransportSelected()) {
    const smtpResult = await sendInfomaniakBillingEmail({
      from: payload.from?.trim() || "SportClubEvo Billing <billing@sportclubevo.com>",
      to: payload.to,
      replyTo: payload.replyTo,
      bcc: payload.bcc,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    });
    return {
      provider: smtpResult.provider,
      messageId: smtpResult.messageId,
      from: smtpResult.from,
      acceptedRecipients: smtpResult.acceptedRecipients,
      rejectedRecipients: smtpResult.rejectedRecipients,
    };
  }

  const result: MailDeliveryResult = await sendMail({
    from: payload.from,
    to: payload.to,
    replyTo: payload.replyTo,
    bcc: payload.bcc,
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
}
