/**
 * GET /api/cron/workspace-background-jobs
 *
 * WORKSPACE-08-05 — bounded workspace background job dispatcher.
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import { dispatchWorkspaceBackgroundJobs } from "@/lib/workspace/background-jobs/workspace-background-job-dispatcher";

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
    const summary = await dispatchWorkspaceBackgroundJobs();
    console.info("[cron/workspace-background-jobs] completed", summary);
    return NextResponse.json(
      {
        claimed: summary.claimed,
        succeeded: summary.succeeded,
        retried: summary.retried,
        dead: summary.dead,
        failed: summary.failed,
        byType: summary.byType,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[cron/workspace-background-jobs] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
