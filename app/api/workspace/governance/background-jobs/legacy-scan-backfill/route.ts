import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { enqueueLegacyNotScannedVersionScanJobsForTenant } from "@/lib/workspace/background-jobs/legacy-scan-backfill-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type BackfillBody = {
  confirm?: boolean;
  batchSize?: number;
  cursorVersionId?: string | null;
};

export async function POST(request: Request) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: BackfillBody;
  try {
    body = (await request.json()) as BackfillBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Explicit confirmation is required (confirm: true)." },
      { status: 400 },
    );
  }

  const summary = await enqueueLegacyNotScannedVersionScanJobsForTenant({
    tenantId: access.tenantId,
    actorUserId: access.actorUserId,
    batchSize: body.batchSize,
    cursorVersionId: body.cursorVersionId ?? null,
  });

  return NextResponse.json({ summary });
}
