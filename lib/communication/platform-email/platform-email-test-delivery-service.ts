import { z } from "zod";
import { resolveTenantEmailSender } from "@/lib/communication/email-sender-service";
import { sendOutboundEmail } from "@/lib/email/outbound-email-transport";
import { evaluatePlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import { renderPlatformCommunicationEmail } from "@/lib/communication/platform-email/email-rendering-service";

const testRecipientSchema = z.string().email();

export class PlatformEmailTestDeliveryError extends Error {
  constructor(
    readonly code:
      | "INVALID_INPUT"
      | "NOT_READY"
      | "FORBIDDEN_RECIPIENT"
      | "TRANSPORT_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "PlatformEmailTestDeliveryError";
  }
}

export async function sendPlatformEmailTestDelivery(input: {
  tenantId: string;
  actorUserId: string;
  testRecipientEmail: unknown;
}): Promise<{ providerMessageId: string }> {
  void input.actorUserId;
  const readiness = await evaluatePlatformEmailReadiness(input.tenantId);
  if (!readiness.ready) {
    throw new PlatformEmailTestDeliveryError(
      "NOT_READY",
      "E-Mail-Versand ist für diesen Mandanten noch nicht bereit.",
    );
  }

  if (typeof input.testRecipientEmail !== "string") {
    throw new PlatformEmailTestDeliveryError(
      "INVALID_INPUT",
      "Test-Empfänger ist erforderlich.",
    );
  }
  const recipient = input.testRecipientEmail.trim().toLowerCase();
  if (!testRecipientSchema.safeParse(recipient).success) {
    throw new PlatformEmailTestDeliveryError(
      "INVALID_INPUT",
      "Bitte geben Sie eine gültige Test-E-Mail ein.",
    );
  }

  const allowedTestRecipient = process.env.COMMUNICATION_EMAIL_TEST_RECIPIENT?.trim().toLowerCase();
  if (!allowedTestRecipient || recipient !== allowedTestRecipient) {
    throw new PlatformEmailTestDeliveryError(
      "FORBIDDEN_RECIPIENT",
      "Diese Test-E-Mail-Adresse ist nicht freigegeben.",
    );
  }

  const { prisma } = await import("@/lib/db/prisma");
  const tenant = await prisma.tenant.findFirst({
    where: { id: input.tenantId },
    select: { name: true },
  });
  const tenantName = tenant?.name ?? "SportClubEvo";

  const rendered = renderPlatformCommunicationEmail({
    tenantName,
    subject: "SportClubEvo — E-Mail-Test",
    bodyText:
      "Dies ist eine geschützte Testzustellung zur Überprüfung der E-Mail-Absender-Konfiguration.",
    includeDeepLink: false,
  });

  try {
    const sender = await resolveTenantEmailSender(input.tenantId);
    const result = await sendOutboundEmail({
      from: sender.formattedFrom,
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `platform-email-test:${input.tenantId}:${input.actorUserId}:${Date.now()}`,
    });
    return { providerMessageId: result.messageId };
  } catch {
    throw new PlatformEmailTestDeliveryError(
      "TRANSPORT_FAILED",
      "Die Test-E-Mail konnte nicht gesendet werden.",
    );
  }
}
