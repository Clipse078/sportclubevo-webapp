import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logAction } from "@/lib/audit/log-action";
import { getInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import {
  findInvoiceByKey,
  findInvoiceRecipientSnapshot,
} from "@/lib/billing/native-billing-commercial-repository";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "@/lib/billing/native-billing-audit";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import {
  MailAttachmentPreflightError,
  MailConfigurationError,
} from "@/lib/email/mailer";
import { Prisma } from "@prisma/client";
import { sendBillingEmail } from "./billing-email-transport";
import {
  buildInvoiceDeliveryEmailContent,
  resolveInvoiceDeliveryLocale,
} from "./invoice-delivery-email-template";
import {
  createInvoiceDeliverySendingAttempt,
  getNextAttemptNumber,
  hasInvoiceDeliveryInSending,
  listInvoiceDeliveriesForInvoiceId,
  markInvoiceDeliveryFailed,
  markInvoiceDeliverySent,
} from "./invoice-delivery-repository";
import type {
  SendNativeInvoiceEmailInput,
  SendNativeInvoiceEmailResult,
} from "./invoice-delivery-types";
import { buildInvoicePdfAttachmentFilename } from "./invoice-pdf-filename";
import { buildInvoiceDeliverySummary } from "./invoice-delivery-summary";
import { resolveBillingEmailIdentity } from "./resolve-billing-email-identity";

const recipientEmailSchema = z.string().email();

export type ValidatedInvoiceDeliveryContext = {
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceByKey>>> & {
    invoiceNumber: string;
  };
  recipientEmail: string;
};

export async function validateInvoiceForDelivery(
  invoiceKey: string,
): Promise<ValidatedInvoiceDeliveryContext> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status !== "FINALIZED") {
    throw new NativeBillingValidationError(
      "Nur finalisierte Rechnungen können per E-Mail versendet werden.",
    );
  }
  if (!invoice.invoiceNumber) {
    throw new NativeBillingValidationError("Rechnungsnummer fehlt.");
  }

  const recipient = await findInvoiceRecipientSnapshot(invoice.id);
  if (!recipient) {
    throw new NativeBillingValidationError("Rechnungsempfänger fehlt.");
  }

  const recipientEmail = recipient.invoiceEmail?.trim();
  if (!recipientEmail) {
    throw new NativeBillingValidationError(
      "Für den Rechnungsempfänger ist keine Rechnungs-E-Mail hinterlegt.",
    );
  }
  const parsedEmail = recipientEmailSchema.safeParse(recipientEmail);
  if (!parsedEmail.success) {
    throw new NativeBillingValidationError("Die Rechnungs-E-Mail ist ungültig.");
  }

  const paymentInstruction = await getInvoicePaymentInstruction(invoiceKey);
  if (!paymentInstruction) {
    throw new NativeBillingValidationError(
      "Zahlungsanweisung fehlt. Rechnung kann nicht versendet werden.",
    );
  }

  return {
    invoice: { ...invoice, invoiceNumber: invoice.invoiceNumber },
    recipientEmail: parsedEmail.data,
  };
}

async function assertSendAllowed(
  invoiceId: string,
  resend: boolean,
  attempts: Awaited<ReturnType<typeof listInvoiceDeliveriesForInvoiceId>>,
): Promise<void> {
  if (await hasInvoiceDeliveryInSending(invoiceId)) {
    throw new NativeBillingConflictError(
      "Ein Versand läuft bereits. Bitte warten Sie, bis der Vorgang abgeschlossen ist.",
    );
  }

  const summary = buildInvoiceDeliverySummary(attempts);
  if (summary.aggregateStatus === "SENDING") {
    throw new NativeBillingConflictError(
      "Ein Versand läuft bereits. Bitte warten Sie, bis der Vorgang abgeschlossen ist.",
    );
  }

  const hasSuccessfulSend = attempts.some((attempt) => attempt.status === "SENT");
  if (hasSuccessfulSend && !resend) {
    throw new NativeBillingConflictError(
      "Diese Rechnung wurde bereits versendet. Verwenden Sie «Erneut senden» für einen weiteren Versand.",
    );
  }
}

function mapDeliveryFailure(error: unknown): { code: string; message: string; userMessage: string } {
  if (error instanceof MailConfigurationError) {
    return {
      code: "MAIL_NOT_CONFIGURED",
      message: error.message,
      userMessage: "Der E-Mail-Versand ist derzeit nicht konfiguriert.",
    };
  }
  if (error instanceof MailAttachmentPreflightError) {
    return {
      code: "ATTACHMENT_TOO_LARGE",
      message: error.message,
      userMessage: "Die Rechnungs-PDF überschreitet die zulässige Anhanggrösse.",
    };
  }
  if (error instanceof NativeBillingValidationError) {
    return {
      code: "VALIDATION",
      message: error.message,
      userMessage: error.message,
    };
  }
  if (error instanceof Error && error.message.includes("PDF")) {
    return {
      code: "PDF_GENERATION_FAILED",
      message: error.message,
      userMessage: "Die Rechnungs-PDF konnte nicht erstellt werden.",
    };
  }
  return {
    code: "PROVIDER_ERROR",
    message: error instanceof Error ? error.message : "Unknown delivery error",
    userMessage: "Der E-Mail-Dienst konnte die Rechnung nicht versenden.",
  };
}

export async function generateInvoiceAttachment(
  invoiceKey: string,
  invoiceNumber: string,
): Promise<{ filename: string; content: Buffer }> {
  const { generateNativeInvoicePdfBytes } = await import("@/lib/billing/invoice-pdf-service");
  const pdfBytes = await generateNativeInvoicePdfBytes(invoiceKey);
  if (!pdfBytes || pdfBytes.byteLength === 0) {
    throw new NativeBillingValidationError("Die Rechnungs-PDF ist leer.");
  }
  const filename = buildInvoicePdfAttachmentFilename(invoiceNumber);
  return {
    filename,
    content: Buffer.from(pdfBytes),
  };
}

export async function sendNativeInvoiceEmail(
  input: SendNativeInvoiceEmailInput,
): Promise<SendNativeInvoiceEmailResult> {
  const context = await validateInvoiceForDelivery(input.invoiceKey);
  const attempts = await listInvoiceDeliveriesForInvoiceId(context.invoice.id);
  await assertSendAllowed(context.invoice.id, input.resend, attempts);

  const attemptNumber = await getNextAttemptNumber(context.invoice.id);
  const deliveryKey = randomUUID();

  let delivery;
  try {
    delivery = await createInvoiceDeliverySendingAttempt({
      key: deliveryKey,
      invoiceId: context.invoice.id,
      recipientEmail: context.recipientEmail,
      attemptNumber,
      createdByUserId: input.actorUserId,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new NativeBillingConflictError(
        "Ein Versand läuft bereits. Bitte warten Sie, bis der Vorgang abgeschlossen ist.",
      );
    }
    throw error;
  }

  const isResend = attempts.some((attempt) => attempt.status === "SENT");
  const startedAction = isResend
    ? NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_RESENT
    : NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_STARTED;

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "Invoice",
    entityId: context.invoice.id,
    action: startedAction,
    afterJson: {
      invoiceId: context.invoice.id,
      invoiceNumber: context.invoice.invoiceNumber,
      deliveryId: delivery.id,
      deliveryKey: delivery.key,
      recipientEmail: context.recipientEmail,
      attemptNumber,
    },
  });

  try {
    const customer = await findBillingCustomerById(context.invoice.billingCustomerId);
    const locale = resolveInvoiceDeliveryLocale(customer?.defaultLanguage);
    const emailContent = buildInvoiceDeliveryEmailContent({
      locale,
      invoiceNumber: context.invoice.invoiceNumber,
      grossTotalMinor: context.invoice.grossTotalMinor,
      currency: context.invoice.currency,
      dueDate: context.invoice.dueDate,
    });

    const attachment = await generateInvoiceAttachment(
      input.invoiceKey,
      context.invoice.invoiceNumber,
    );

    const identity = await resolveBillingEmailIdentity();

    const transportResult = await sendBillingEmail({
      from: identity.from,
      to: context.recipientEmail,
      replyTo: identity.replyTo,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: "application/pdf",
        },
      ],
      idempotencyKey: `invoice-delivery:${delivery.key}`,
    });

    const sent = await markInvoiceDeliverySent({
      deliveryId: delivery.id,
      provider: transportResult.provider,
      providerMessageId: transportResult.messageId,
      subjectSnapshot: emailContent.subject,
      fromAddressSnapshot: transportResult.from,
      replyToSnapshot: identity.replyTo ?? null,
      attachmentFilename: attachment.filename,
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "Invoice",
      entityId: context.invoice.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_SENT,
      afterJson: {
        invoiceId: context.invoice.id,
        invoiceNumber: context.invoice.invoiceNumber,
        deliveryId: sent.id,
        deliveryKey: sent.key,
        recipientEmail: context.recipientEmail,
        provider: transportResult.provider,
        providerMessageId: transportResult.messageId,
        attemptNumber,
      },
    });

    const summary = buildInvoiceDeliverySummary(
      await listInvoiceDeliveriesForInvoiceId(context.invoice.id),
    );

    return { delivery: sent, aggregateStatus: summary.aggregateStatus };
  } catch (error) {
    const failure = mapDeliveryFailure(error);
    const failed = await markInvoiceDeliveryFailed({
      deliveryId: delivery.id,
      errorCode: failure.code,
      errorMessage: failure.userMessage,
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "Invoice",
      entityId: context.invoice.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_DELIVERY_FAILED,
      afterJson: {
        invoiceId: context.invoice.id,
        invoiceNumber: context.invoice.invoiceNumber,
        deliveryId: failed.id,
        deliveryKey: failed.key,
        recipientEmail: context.recipientEmail,
        attemptNumber,
        errorCode: failure.code,
      },
    });

    if (error instanceof NativeBillingValidationError || error instanceof NativeBillingConflictError) {
      throw error;
    }

    throw new NativeBillingValidationError(failure.userMessage);
  }
}
