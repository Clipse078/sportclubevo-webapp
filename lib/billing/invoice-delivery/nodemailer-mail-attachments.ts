import type { MailAttachment } from "@/lib/email/mailer";

/** Maps shared billing attachments to Nodemailer attachment options (CID + disposition preserved). */
export function mapMailAttachmentsForNodemailer(attachments: MailAttachment[] | undefined) {
  return attachments?.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType,
    cid: attachment.cid,
    contentDisposition:
      attachment.contentDisposition ?? (attachment.cid ? "inline" : "attachment"),
  }));
}
