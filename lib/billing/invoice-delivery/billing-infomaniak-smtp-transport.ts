import nodemailer from "nodemailer";
import type { MailAttachment } from "@/lib/email/mailer";
import {
  BillingSmtpConfigurationError,
  requireBillingSmtpConfig,
  type BillingSmtpConfig,
} from "./billing-smtp-config";

export type InfomaniakSmtpSendPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
};

export type InfomaniakSmtpSendResult = {
  provider: "infomaniak-smtp";
  messageId: string;
  from: string;
};

function createTransport(config: BillingSmtpConfig) {
  const secure = config.encryption === "TLS";
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: config.encryption === "STARTTLS",
    auth: {
      user: config.user,
      pass: config.password,
    },
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

function sanitizeSmtpError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.replace(
      /(auth|password|credential)[^\n]*/gi,
      "[redacted]",
    );
    return message.slice(0, 500);
  }
  return "Infomaniak SMTP delivery failed.";
}

export async function sendInfomaniakBillingEmail(
  payload: InfomaniakSmtpSendPayload,
): Promise<InfomaniakSmtpSendResult> {
  let config: BillingSmtpConfig;
  try {
    config = requireBillingSmtpConfig();
  } catch (error) {
    if (error instanceof BillingSmtpConfigurationError) {
      throw error;
    }
    throw new BillingSmtpConfigurationError("Billing SMTP configuration is invalid.");
  }

  const transport = createTransport(config);

  try {
    const info = await transport.sendMail({
      from: payload.from,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    const messageId =
      typeof info.messageId === "string" && info.messageId.trim()
        ? info.messageId.trim()
        : `infomaniak-smtp-${Date.now()}`;

    return {
      provider: "infomaniak-smtp",
      messageId,
      from: payload.from,
    };
  } catch (error) {
    throw new Error(sanitizeSmtpError(error));
  } finally {
    transport.close();
  }
}
