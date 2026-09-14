/**
 * GET /api/cron/billing-inbound-sync
 *
 * BILLING-COMMS-01B — poll billing@sportclubevo.com via IMAP (incremental UID cursor).
 *
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runBillingInboundImapSync } from "@/lib/billing/billing-inbound/billing-inbound-sync-service";
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
    const summary = await runBillingInboundImapSync();
    console.info("[cron/billing-inbound-sync] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/billing-inbound-sync] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
