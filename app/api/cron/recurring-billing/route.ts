/**
 * GET /api/cron/recurring-billing
 *
 * BILLING-AUTO-01 — daily recurring billing evaluation (Vercel Cron).
 * Uses the same canonical runRecurringBilling service as manual Commercial execution.
 *
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runAutomaticRecurringBillingCron } from "@/lib/billing/recurring/recurring-billing-service";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !isExternalSideEffectConfigured("cron", ["CRON_SECRET"])) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomaticRecurringBillingCron();
    console.info("[cron/recurring-billing] completed", {
      runKey: result.runKey,
      mode: result.summary.mode,
      contractsEvaluated: result.summary.contractsEvaluated,
      invoicesCreated: result.summary.invoicesCreated,
      invoicesSent: result.summary.invoicesSent,
      skipped: result.summary.skipped,
      blocked: result.summary.blocked,
      failed: result.summary.failed,
    });
    return NextResponse.json({ runKey: result.runKey, summary: result.summary }, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/recurring-billing] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
