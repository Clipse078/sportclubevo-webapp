/**
 * GET /api/platform/diagnostics/sce-perf-01a-region
 *
 * PERFORMANCE-01A-R1 — temporary read-only Vercel region + DB RTT proof (STAGE/Preview only).
 *
 * Returns safe operational timing only:
 *   - process.env.VERCEL_REGION (authoritative execution region)
 *   - parsed Neon AWS region (no hostname / credentials)
 *   - SELECT 1 warm sample latencies (shared Prisma client)
 *
 * Unavailable in PROD. Requires platform TENANTS_MANAGE (non-impersonated).
 * Remove after region mismatch is proven and infrastructure is updated.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  collectPerf01aRegionProof,
  isPerf01aRegionProofEnvironment,
} from "@/lib/diagnostics/sce-perf-01a-region-proof";
import { getRuntimeEnvironment } from "@/lib/env";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function rejectNonPlatformActorSession(
  session: NonNullable<
    Extract<Awaited<ReturnType<typeof requireApiPermission>>, { ok: true }>["session"]
  >,
): NextResponse | null {
  if (session.user.isImpersonating) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorUserId = session.user.actorUserId ?? session.user.id;
  if (!actorUserId || session.user.effectiveUserId !== actorUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET(): Promise<NextResponse> {
  const runtimeEnv = getRuntimeEnvironment();
  if (!isPerf01aRegionProofEnvironment(runtimeEnv)) {
    return NextResponse.json(
      {
        error:
          "This diagnostic is only available in STAGE or Preview deployments.",
      },
      { status: 403 },
    );
  }

  const access = await requireApiPermission(PERMISSIONS.TENANTS_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const impersonationRejection = rejectNonPlatformActorSession(access.session);
  if (impersonationRejection) {
    return impersonationRejection;
  }

  try {
    const payload = await collectPerf01aRegionProof(prisma);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Region proof diagnostic failed." },
      { status: 500 },
    );
  }
}
