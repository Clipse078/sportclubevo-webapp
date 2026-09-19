import type { BillingEmailTransportPayload } from "@/lib/billing/invoice-delivery/billing-email-transport";
import { resolvePlatformInvoiceEmailBcc } from "@/lib/billing/invoice-delivery/billing-invoice-email-policy";
import { joinRecipientListForTransport } from "./billing-communication-recipients";

export type BillingCorrespondenceTransportInput = {
  from: string;
  to: string[];
  cc: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  inReplyTo?: string | null;
  referencesHeader?: string | null;
};

export function buildBillingCorrespondenceTransportPayload(
  input: BillingCorrespondenceTransportInput,
): BillingEmailTransportPayload {
  const platformBcc = resolvePlatformInvoiceEmailBcc("normal");
  return {
    from: input.from,
    to: joinRecipientListForTransport(input.to),
    cc: input.cc.length > 0 ? joinRecipientListForTransport(input.cc) : undefined,
    replyTo: input.replyTo,
    bcc: platformBcc,
    subject: input.subject,
    html: input.html,
    text: input.text,
    idempotencyKey: input.idempotencyKey,
    deliveryIntent: "normal",
    inReplyTo: input.inReplyTo ?? undefined,
    references: input.referencesHeader ?? undefined,
  };
}

export function resolvePersistedPlatformBccAddresses(): string[] {
  const bcc = resolvePlatformInvoiceEmailBcc("normal");
  return bcc ? [bcc] : [];
}
