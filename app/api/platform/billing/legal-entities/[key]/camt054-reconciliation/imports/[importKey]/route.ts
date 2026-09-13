import { NextRequest, NextResponse } from "next/server";
import { getCamt054ReconciliationImportDetail } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-overview-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ key: string; importKey: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { importKey } = await context.params;
  try {
    const detail = await getCamt054ReconciliationImportDetail(importKey);
    return NextResponse.json({ reconciliation: detail });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
