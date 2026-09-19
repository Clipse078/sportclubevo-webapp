import { z } from "zod";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { getInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import { NativeBillingNotFoundError, NativeBillingValidationError } from "@/lib/billing/native-billing-types";
import { sendBillingEmail } from "./billing-email-transport";
import {
  buildInvoiceDeliveryEmailContent,
  resolveInvoiceDeliveryLocale,
} from "./invoice-delivery-email-template";
import { buildInvoiceDeliveryEmailAttachments } from "./invoice-delivery-email-inline-logos";
import { buildInvoiceDeliveryBillingTransportPayload } from "./invoice-delivery-transport-payload";
import { buildInvoicePdfAttachmentFilename } from "./invoice-pdf-filename";
import { resolveBillingEmailIdentity } from "./resolve-billing-email-identity";
import { requireBillingTestDeliveryRecipient } from "./billing-test-delivery-guards";

const TEST_DELIVERY_KIND = "BILLING_INVOICE_TEST_DELIVERY";

export type BillingInvoiceTestDeliveryInput = {
  invoiceKey: string;
  actorUserId: string;
};

export type BillingInvoiceTestDeliveryResult = {
  kind: typeof TEST_DELIVERY_KIND;
  invoiceKey: string;
  invoiceNumber: string;
  recipientEmail: string;
  provider: string;
  messageId: string;
  from: string;
  replyTo: string | null;
  attachmentFilename: string;
  subject: string;
};

export async function executeBillingInvoiceTestDelivery(
  input: BillingInvoiceTestDeliveryInput,
): Promise<BillingInvoiceTestDeliveryResult> {
  const testRecipient = requireBillingTestDeliveryRecipient();

  const invoice = await findInvoiceByKey(input.invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  if (invoice.status !== "FINALIZED") {
    throw new NativeBillingValidationError(
      "Nur finalisierte Rechnungen können für Testversand verwendet werden.",
    );
  }
  if (!invoice.invoiceNumber) {
    throw new NativeBillingValidationError("Rechnungsnummer fehlt.");
  }

  const paymentInstruction = await getInvoicePaymentInstruction(input.invoiceKey);
  if (!paymentInstruction) {
    throw new NativeBillingValidationError(
      "Zahlungsanweisung fehlt. Testversand kann nicht erstellt werden.",
    );
  }

  const recipientSchema = z.string().email();
  const parsedRecipient = recipientSchema.safeParse(testRecipient);
  if (!parsedRecipient.success) {
    throw new NativeBillingValidationError(
      "BILLING_TEST_RECIPIENT ist keine gültige E-Mail-Adresse.",
    );
  }

  const customer = await findBillingCustomerById(invoice.billingCustomerId);
  const locale = resolveInvoiceDeliveryLocale(customer?.defaultLanguage);
  const emailContent = buildInvoiceDeliveryEmailContent({
    locale,
    invoiceNumber: invoice.invoiceNumber,
    grossTotalMinor: invoice.grossTotalMinor,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
  });

  const { generateNativeInvoicePdfBytes } = await import("@/lib/billing/invoice-pdf-service");
  const pdfBytes = await generateNativeInvoicePdfBytes(input.invoiceKey);
  if (!pdfBytes || pdfBytes.byteLength === 0) {
    throw new NativeBillingValidationError("Die Rechnungs-PDF ist leer.");
  }
  const attachment = {
    filename: buildInvoicePdfAttachmentFilename(invoice.invoiceNumber),
    content: Buffer.from(pdfBytes),
  };

  const identity = await resolveBillingEmailIdentity();

  const transportResult = await sendBillingEmail(
    buildInvoiceDeliveryBillingTransportPayload({
      deliveryIntent: "protected-test",
      from: identity.from,
      to: parsedRecipient.data,
      replyTo: identity.replyTo,
      subject: `[TEST DELIVERY] ${emailContent.subject}`,
      html: emailContent.html,
      text: emailContent.text,
      attachments: buildInvoiceDeliveryEmailAttachments(attachment),
      idempotencyKey: `billing-test-delivery:${invoice.key}:${input.actorUserId}`,
    }),
  );

  return {
    kind: TEST_DELIVERY_KIND,
    invoiceKey: invoice.key,
    invoiceNumber: invoice.invoiceNumber,
    recipientEmail: parsedRecipient.data,
    provider: transportResult.provider,
    messageId: transportResult.messageId,
    from: transportResult.from,
    replyTo: identity.replyTo ?? null,
    attachmentFilename: attachment.filename,
    subject: emailContent.subject,
  };
}
