import { NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { getInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-summary";
import { serializeInvoiceDeliverySummary } from "@/lib/billing/invoice-delivery/invoice-delivery-serializers";
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
    const summary = await getInvoiceDeliverySummary(invoiceKey);
    if (!summary) {
      return NextResponse.json({ error: "Rechnung nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ delivery: serializeInvoiceDeliverySummary(summary) });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
