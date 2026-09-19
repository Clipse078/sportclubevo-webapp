import nodemailer from "nodemailer";
import type { BillingEmailTransportPayload } from "./billing-email-transport";
import { mapMailAttachmentsForNodemailer } from "./nodemailer-mail-attachments";

/** Compiles the final Nodemailer MIME tree without sending (for automated MIME validation). */
export async function compileInvoiceDeliveryNodemailerMessage(
  payload: Pick<
    BillingEmailTransportPayload,
    "from" | "to" | "replyTo" | "bcc" | "subject" | "html" | "text" | "attachments"
  >,
): Promise<string> {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const info = await transport.sendMail({
    from: payload.from ?? "SportClubEvo Billing <billing@sportclubevo.com>",
    to: payload.to,
    replyTo: payload.replyTo,
    bcc: payload.bcc,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: mapMailAttachmentsForNodemailer(payload.attachments),
  });
  return info.message.toString();
}
