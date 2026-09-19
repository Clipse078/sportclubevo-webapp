import { NextResponse } from "next/server";
import { getInvoiceBillingCommunicationTimeline } from "@/lib/billing/billing-communication/billing-communication-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ invoiceKey: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoiceKey } = await context.params;
  try {
    const communications = await getInvoiceBillingCommunicationTimeline(invoiceKey);
    return NextResponse.json({ communications });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
