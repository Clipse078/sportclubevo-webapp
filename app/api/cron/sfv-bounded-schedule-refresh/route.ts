/**
 * GET /api/cron/sfv-bounded-schedule-refresh
 *
 * STAGE-only guarded operational entry for ONE bounded historical SFV schedule
 * refresh per invocation. Uses deployed SFV credentials (same path as cron sync).
 *
 * Query parameters (all required except documented defaults):
 *   tenantId  — must match an enabled TenantSfvConfig (e.g. fc-allschwil)
 *   seasonId  — positive SFV season id (e.g. 2027)
 *   dateFrom  — YYYY-MM-DD inclusive
 *   dateTo    — YYYY-MM-DD inclusive (max span SCHEDULE_WINDOW_MAX_DAYS)
 *
 * Authorization: Authorization: Bearer ${CRON_SECRET} (fail closed).
 * Environment: APP_ENV=stage only — production returns 403 even with valid secret.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRuntimeEnvironment } from "@/lib/env";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";
import { runBoundedSfvScheduleSync } from "@/lib/integrations/sfv/sync/bounded-schedule-sync";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (
    !secret ||
    !isExternalSideEffectConfigured("cron", ["CRON_SECRET"])
  ) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

function parsePositiveInt(value: string | null): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const runtimeEnv = getRuntimeEnvironment();
  if (!runtimeEnv.isStage) {
    return NextResponse.json(
      { error: "This endpoint is only available in the STAGE environment." },
      { status: 403 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tenantId = searchParams.get("tenantId")?.trim() ?? "";
  const seasonId = parsePositiveInt(searchParams.get("seasonId"));
  const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
  const dateTo = searchParams.get("dateTo")?.trim() ?? "";

  if (!tenantId || seasonId == null || !dateFrom || !dateTo) {
    return NextResponse.json(
      {
        error:
          "Required query parameters: tenantId, seasonId, dateFrom, dateTo (ISO dates).",
      },
      { status: 400 },
    );
  }

  const outcome = await runBoundedSfvScheduleSync({
    tenantId,
    seasonId,
    dateFrom,
    dateTo,
  });

  if (!outcome.ok) {
    const status =
      outcome.code === "TENANT_NOT_ENABLED"
        ? 404
        : outcome.code === "INVALID_DATE_WINDOW" ||
            outcome.code === "INVALID_SEASON" ||
            outcome.code === "INVALID_TENANT"
          ? 400
          : 500;

    return NextResponse.json(
      { error: outcome.message, code: outcome.code },
      { status },
    );
  }

  return NextResponse.json({ result: outcome.result }, { status: 200 });
}
