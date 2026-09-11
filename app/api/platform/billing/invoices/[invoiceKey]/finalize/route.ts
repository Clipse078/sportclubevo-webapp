import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { finalizeInvoice } from "@/lib/billing/native-billing-commercial-service";
import { serializeInvoice } from "@/lib/billing/native-billing-commercial-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const finalized = await finalizeInvoice(invoiceKey, access.actorUserId!);
    return NextResponse.json({ invoice: serializeInvoice(finalized) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
