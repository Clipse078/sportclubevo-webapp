/**
 * GET /api/cron/communication-attachment-cleanup
 * SCE-COMM-EVO-09 — bounded cleanup for abandoned compose uploads.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runStaleUnlinkedCommunicationAttachmentCleanup } from "@/lib/communication/attachment-cleanup-service";
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
    const summary = await runStaleUnlinkedCommunicationAttachmentCleanup();
    console.info("[cron/communication-attachment-cleanup] completed", summary);
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/communication-attachment-cleanup] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
