import { NextRequest, NextResponse } from "next/server";
import { serializeCamt054ReconciliationReport } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-serializers";
import { reconcileCamt054Statement } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ key: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key: legalEntityKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const xml = String(body.xml ?? "");
  const dryRun = body.dryRun === true || body.dryRun === "true";

  try {
    const report = await reconcileCamt054Statement({
      legalEntityKey,
      xml,
      dryRun,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json({
      reconciliation: serializeCamt054ReconciliationReport(report),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
