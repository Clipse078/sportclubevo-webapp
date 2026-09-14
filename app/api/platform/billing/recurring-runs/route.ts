import { NextRequest, NextResponse } from "next/server";
import { nativeBillingErrorResponse } from "@/lib/billing/native-billing-api-errors";
import {
  getRecurringBillingAutomationStatus,
  runRecurringBilling,
} from "@/lib/billing/recurring/recurring-billing-service";
import { listRecentBillingRecurringRuns } from "@/lib/billing/recurring/recurring-billing-repository";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePlatformApiPermission } from "@/lib/permissions/require-platform-api-permission";
import { prisma } from "@/lib/db/prisma";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

export async function GET() {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!(await isPlatformSuperAdmin(prisma, access.actorUserId!))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [automation, recentRuns] = await Promise.all([
    getRecurringBillingAutomationStatus(),
    listRecentBillingRecurringRuns(10),
  ]);

  return NextResponse.json({
    automation,
    recentRuns: recentRuns.map((run) => ({
      key: run.key,
      mode: run.mode,
      trigger: run.trigger,
      status: run.status,
      asOfDate: run.asOfDate.toISOString().slice(0, 10),
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      summary: run.summaryJson,
    })),
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePlatformApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!(await isPlatformSuperAdmin(prisma, access.actorUserId!))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const mode = body.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN";
  const deliverAutomatically =
    mode === "EXECUTE" && body.deliverAutomatically === true;

  try {
    const result = await runRecurringBilling({
      mode,
      trigger: "MANUAL",
      asOfDate: body.asOfDate ? String(body.asOfDate) : undefined,
      deliverAutomatically,
      actorUserId: access.actorUserId!,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return nativeBillingErrorResponse(error);
  }
}
