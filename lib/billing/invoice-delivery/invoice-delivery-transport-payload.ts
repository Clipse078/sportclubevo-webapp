import type { MailAttachment } from "@/lib/email/mailer";
import type { BillingEmailTransportPayload } from "./billing-email-transport";
import type { BillingEmailDeliveryIntent } from "./billing-invoice-email-policy";
import { resolvePlatformInvoiceEmailBcc } from "./billing-invoice-email-policy";

export type InvoiceDeliveryBillingTransportInput = {
  deliveryIntent: BillingEmailDeliveryIntent;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments: MailAttachment[];
  idempotencyKey?: string;
  simulateFailure?: boolean;
};

/** Canonical outbound payload for customer invoice and protected internal test delivery. */
export function buildInvoiceDeliveryBillingTransportPayload(
  input: InvoiceDeliveryBillingTransportInput,
): BillingEmailTransportPayload {
  return {
    from: input.from,
    to: input.to,
    replyTo: input.replyTo,
    bcc: resolvePlatformInvoiceEmailBcc(input.deliveryIntent),
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
    idempotencyKey: input.idempotencyKey,
    simulateFailure: input.simulateFailure,
    deliveryIntent: input.deliveryIntent,
  };
}
