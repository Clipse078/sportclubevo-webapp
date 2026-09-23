/**
 * GET /api/cron/workspace-trash-purge
 *
 * WORKSPACE-08-03 — bounded reference-aware trash purge batches.
 * Authorization: Bearer ${CRON_SECRET} (fail closed when unset).
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { purgeExpiredTrashedWorkspaceDocumentsAllTenants } from "@/lib/workspace/governance/workspace-trash-purge-batch-service";
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
    const summary = await purgeExpiredTrashedWorkspaceDocumentsAllTenants();
    console.info("[cron/workspace-trash-purge] completed", {
      tenantCount: summary.tenants.length,
      purged: summary.tenants.reduce((n, t) => n + t.purged, 0),
      skipped: summary.tenants.reduce((n, t) => n + t.skipped, 0),
    });
    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error(
      "[cron/workspace-trash-purge] Unexpected error:",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
}
