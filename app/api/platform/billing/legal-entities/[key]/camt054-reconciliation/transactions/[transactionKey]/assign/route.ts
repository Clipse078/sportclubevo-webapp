import { NextRequest, NextResponse } from "next/server";
import { manuallyAssignCamt054Transaction } from "@/lib/billing/camt054-reconciliation/camt054-manual-match-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ key: string; transactionKey: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { transactionKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const invoiceKey = String(body.invoiceKey ?? "");

  try {
    const result = await manuallyAssignCamt054Transaction({
      transactionKey,
      invoiceKey,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({ assignment: result });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
