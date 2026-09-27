/**
 * GET /api/cron/platform-communication-email
 * SCE-COMM-14 — bounded batch processor for platform communication outbound email.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processPendingPlatformCommunicationEmailDeliveries } from "@/lib/communication/platform-email/platform-email-delivery-processor";
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
    const summary = await processPendingPlatformCommunicationEmailDeliveries();
    console.info("[cron/platform-communication-email] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/platform-communication-email] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
