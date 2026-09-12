import { NextResponse } from "next/server";
import { buildInvoiceDeliveryEmailContent } from "@/lib/billing/invoice-delivery/invoice-delivery-email-template";
import { buildInvoicePdfAttachmentFilename } from "@/lib/billing/invoice-delivery/invoice-pdf-filename";
import { validateInvoiceForDelivery } from "@/lib/billing/invoice-delivery/invoice-delivery-service";
import { findBillingCustomerById } from "@/lib/billing/native-billing-repository";
import { resolveInvoiceDeliveryLocale } from "@/lib/billing/invoice-delivery/invoice-delivery-email-template";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

/** Renders the billing invoice email template for platform review (no send). */
export async function GET(_request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const contextValidated = await validateInvoiceForDelivery(invoiceKey);
    const customer = await findBillingCustomerById(contextValidated.invoice.billingCustomerId);
    const locale = resolveInvoiceDeliveryLocale(customer?.defaultLanguage);
    const content = buildInvoiceDeliveryEmailContent({
      locale,
      invoiceNumber: contextValidated.invoice.invoiceNumber,
      grossTotalMinor: contextValidated.invoice.grossTotalMinor,
      currency: contextValidated.invoice.currency,
      dueDate: contextValidated.invoice.dueDate,
    });

    return NextResponse.json({
      subject: content.subject,
      html: content.html,
      text: content.text,
      attachmentFilename: buildInvoicePdfAttachmentFilename(
        contextValidated.invoice.invoiceNumber,
      ),
      pdfSource: "generateNativeInvoicePdfBytes",
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
