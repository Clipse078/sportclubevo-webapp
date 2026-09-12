import { NextRequest, NextResponse } from "next/server";
import { serializeCamt054ReconciliationReport } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-serializers";
import { reconcileCamt054Statement } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-service";
import {
  assertCamt054Filename,
  assertCamt054UploadWithinLimit,
  sha256Camt054Content,
} from "@/lib/billing/camt054-reconciliation/camt054-upload-limits";
import { getCamt054ReconciliationOverview } from "@/lib/billing/camt054-reconciliation/camt054-reconciliation-overview-service";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key: legalEntityKey } = await context.params;
  try {
    const overview = await getCamt054ReconciliationOverview(legalEntityKey);
    return NextResponse.json({ reconciliation: overview });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { key: legalEntityKey } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const xml = String(body.xml ?? "");
  const filename = String(body.filename ?? "");
  const dryRun = body.dryRun === true || body.dryRun === "true";

  try {
    if (!dryRun) {
      assertCamt054Filename(filename);
    }
    const byteLength = Buffer.byteLength(xml, "utf8");
    assertCamt054UploadWithinLimit(byteLength);

    const report = await reconcileCamt054Statement({
      legalEntityKey,
      xml,
      dryRun,
      actorUserId: access.actorUserId!,
      filename: dryRun ? undefined : filename,
      contentSha256: sha256Camt054Content(xml),
    });
    return NextResponse.json({
      reconciliation: serializeCamt054ReconciliationReport(report),
    });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
