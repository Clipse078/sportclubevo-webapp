import { NextResponse } from "next/server";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import {
  assertTenantMatchesBillingCustomer,
  resolveTenantIdForBillingCustomer,
} from "@/lib/billing/billing-communication/billing-communication-tenant";
import {
  BillingCommunicationAttachmentServiceError,
  downloadBillingCommunicationAttachment,
} from "@/lib/billing/billing-communication/billing-communication-attachment-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ invoiceKey: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey, attachmentId } = await context.params;
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
  }

  const tenantId = await resolveTenantIdForBillingCustomer(invoice.billingCustomerId);
  await assertTenantMatchesBillingCustomer(tenantId, invoice.billingCustomerId);

  try {
    const downloaded = await downloadBillingCommunicationAttachment({
      tenantId,
      invoiceId: invoice.id,
      attachmentId,
    });
    return new NextResponse(downloaded.stream, {
      status: 200,
      headers: {
        "Content-Type": downloaded.contentType,
        "Content-Length": String(downloaded.sizeBytes),
        "Content-Disposition": `attachment; filename="${downloaded.filename.replace(/"/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof BillingCommunicationAttachmentServiceError) {
      const status = error.code === "ATTACHMENT_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return nativeBillingErrorResponse(error);
  }
}
