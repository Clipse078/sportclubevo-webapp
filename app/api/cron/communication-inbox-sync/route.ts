/**
 * GET /api/cron/communication-inbox-sync
 * SCE-COMM-15 — bounded batch processor for Communication Center IMAP sync.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runCommunicationCenterInboundSync } from "@/lib/communication/inbox/sync-service";
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
    const summary = await runCommunicationCenterInboundSync();
    console.info("[cron/communication-inbox-sync] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/communication-inbox-sync] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
