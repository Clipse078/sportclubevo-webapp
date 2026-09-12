import { sendMail, type MailAttachment, type MailDeliveryResult } from "@/lib/email/mailer";

export type BillingEmailTransportPayload = {
  from?: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
  idempotencyKey?: string;
};

export type BillingEmailTransportResult = {
  provider: "resend";
  messageId: string;
  from: string;
};

export async function sendBillingEmail(
  payload: BillingEmailTransportPayload,
): Promise<BillingEmailTransportResult> {
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
}
