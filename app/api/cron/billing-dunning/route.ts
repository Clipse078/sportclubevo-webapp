/**
 * GET /api/cron/billing-dunning
 *
 * SCE-SUPERADMIN-BILLING-01G — hourly dunning enforcement and reconciliation.
 * Authorization: Bearer ${CRON_SECRET} (same pattern as other cron routes).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processBillingDunning } from "@/lib/billing/platform-dunning-service";
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
    const summary = await processBillingDunning();
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error("[cron/billing-dunning] Unexpected error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
