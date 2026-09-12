import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  getInvoicePaymentSummary,
  recordInvoicePayment,
} from "@/lib/billing/invoice-payments/invoice-payment-service";
import { serializeInvoicePaymentSummary } from "@/lib/billing/invoice-payments/invoice-payment-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const summary = await getInvoicePaymentSummary(invoiceKey);
    if (!summary) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({
      paymentSummary: serializeInvoicePaymentSummary(summary),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const result = await recordInvoicePayment({
      invoiceKey,
      amountMinor: Number(body.amountMinor),
      currency: String(body.currency ?? "CHF"),
      paymentDate: String(body.paymentDate ?? ""),
      method: "BANK_TRANSFER_MANUAL",
      reference: body.reference != null ? String(body.reference) : null,
      note: body.note != null ? String(body.note) : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({
      paymentSummary: serializeInvoicePaymentSummary(result.summary),
      payment: result.payment.key,
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
