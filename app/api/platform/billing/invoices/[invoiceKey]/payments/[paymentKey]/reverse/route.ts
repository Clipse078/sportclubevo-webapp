import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { reverseInvoicePayment } from "@/lib/billing/invoice-payments/invoice-payment-service";
import { serializeInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = {
  params: Promise<{ invoiceKey: string; paymentKey: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { paymentKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const result = await reverseInvoicePayment({
      paymentKey,
      reason: String(body.reason ?? ""),
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({
      paymentSummary: serializeInvoicePaymentSummary(result.summary),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
