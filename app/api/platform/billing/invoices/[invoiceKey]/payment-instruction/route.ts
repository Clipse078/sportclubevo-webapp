import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createInvoicePaymentInstruction,
  getInvoicePaymentInstruction,
} from "@/lib/billing/invoice-payment-instruction-service";
import { serializeInvoicePaymentInstructionMasked } from "@/lib/billing/invoice-payment-instruction-serializers";
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
    const instruction = await getInvoicePaymentInstruction(invoiceKey);
    if (!instruction) {
      return NextResponse.json({ paymentInstruction: null });
    }
    return NextResponse.json({
      paymentInstruction: serializeInvoicePaymentInstructionMasked(instruction),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const instruction = await createInvoicePaymentInstruction(
      invoiceKey,
      access.actorUserId!,
    );
    return NextResponse.json(
      { paymentInstruction: serializeInvoicePaymentInstructionMasked(instruction) },
      { status: 201 },
    );
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
