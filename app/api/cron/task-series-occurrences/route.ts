/**
 * GET /api/cron/task-series-occurrences
 *
 * AUFGABEN-03B — automatic TaskSeries occurrence generation (Vercel Cron).
 * Idempotent, tenant-scoped; reuses generateTaskOccurrencesInternal.
 *
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runAutomaticTaskSeriesOccurrenceGeneration } from "@/lib/tasks/task-series-auto-generate";
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
    const summary = await runAutomaticTaskSeriesOccurrenceGeneration();
    console.info("[cron/task-series-occurrences] completed", summary);
    return NextResponse.json({ summary }, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/task-series-occurrences] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
