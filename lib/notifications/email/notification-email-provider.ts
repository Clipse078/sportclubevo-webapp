import { sendMail, MailConfigurationError } from "@/lib/email/mailer";
import { resolveTenantEmailSender } from "@/lib/communication/email-sender-service";
import {
  renderNotificationEmailHtml,
  renderNotificationEmailText,
  type NotificationEmailTemplateInput,
} from "./template";

export type NotificationEmailSendInput = NotificationEmailTemplateInput & {
  tenantId: string;
  to: string;
  subject: string;
  idempotencyKey: string;
};

export type NotificationEmailSendResult = {
  providerMessageId: string;
  from: string;
};

export class NotificationEmailProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationEmailProviderError";
  }
}

export interface NotificationEmailProvider {
  send(input: NotificationEmailSendInput): Promise<NotificationEmailSendResult>;
}

export class ResendNotificationEmailProvider implements NotificationEmailProvider {
  async send(input: NotificationEmailSendInput): Promise<NotificationEmailSendResult> {
    const sender = await resolveTenantEmailSender(input.tenantId);
    const html = renderNotificationEmailHtml(input);
    const text = renderNotificationEmailText(input);

    try {
      const result = await sendMail({
        from: sender.formattedFrom,
        to: input.to,
        subject: input.subject,
        html,
        text,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        providerMessageId: result.providerMessageId,
        from: result.from,
      };
    } catch (error) {
      if (error instanceof MailConfigurationError) {
        throw new NotificationEmailProviderError("NOT_CONFIGURED", error.message);
      }
      throw new NotificationEmailProviderError(
        "PROVIDER_FAILURE",
        error instanceof Error ? error.message : "Email delivery failed",
      );
    }
  }
}

let defaultProvider: NotificationEmailProvider | null = null;

export function getNotificationEmailProvider(): NotificationEmailProvider {
  if (!defaultProvider) {
    defaultProvider = new ResendNotificationEmailProvider();
  }
  return defaultProvider;
}

export function setNotificationEmailProviderForTests(
  provider: NotificationEmailProvider | null,
): void {
  defaultProvider = provider;
}
