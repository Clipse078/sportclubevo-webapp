import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { sendNativeInvoiceEmail } from "@/lib/billing/invoice-delivery/invoice-delivery-service";
import { buildInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-summary";
import { serializeInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";
import { listInvoiceDeliveriesForInvoiceId } from "@/lib/billing/invoice-delivery/invoice-delivery-repository";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  let resend = false;
  try {
    const body = (await request.json()) as { resend?: boolean };
    resend = body.resend === true;
  } catch {
    resend = false;
  }

  try {
    const result = await sendNativeInvoiceEmail({
      invoiceKey,
      actorUserId: access.actorUserId!,
      resend,
    });
    const invoice = await findInvoiceByKey(invoiceKey);
    const attempts = invoice
      ? await listInvoiceDeliveriesForInvoiceId(invoice.id)
      : [];
    const summary = buildInvoiceDeliverySummary(attempts);

    return NextResponse.json({
      delivery: {
        key: result.delivery.key,
        status: result.delivery.status,
        attemptNumber: result.delivery.attemptNumber,
        sentAt: result.delivery.sentAt?.toISOString() ?? null,
        recipientEmail: result.delivery.recipientEmail,
      },
      summary: serializeInvoiceDeliverySummary(summary),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
