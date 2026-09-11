import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  createDraftInvoiceFromContract,
  getInvoicesOverview,
} from "@/lib/billing/native-billing-commercial-service";
import { serializeInvoice } from "@/lib/billing/native-billing-commercial-serializers";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const invoices = await getInvoicesOverview();
  return NextResponse.json({ invoices: invoices.map(serializeInvoice) });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as Record<string, unknown>;
  try {
    const created = await createDraftInvoiceFromContract({
      billingContractId: String(body.billingContractId ?? ""),
      periodStart: String(body.periodStart ?? ""),
      periodEnd: String(body.periodEnd ?? ""),
      invoiceDate: body.invoiceDate ? String(body.invoiceDate) : null,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ invoice: serializeInvoice(created) }, { status: 201 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
