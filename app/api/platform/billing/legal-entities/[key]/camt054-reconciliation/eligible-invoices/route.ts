import { NextRequest, NextResponse } from "next/server";
import { listEligibleInvoicesForManualCamt054Match } from "@/lib/billing/camt054-reconciliation/camt054-manual-match-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key: legalEntityKey } = await context.params;
  try {
    const invoices = await listEligibleInvoicesForManualCamt054Match(legalEntityKey);
    return NextResponse.json({ invoices });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
