/**
 * POST /api/collaboration/training-series/[seriesId]/prepare-communication
 *
 * SCE-COLLAB-01D — prepare a grouped training announcement for a multi-activity batch.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import type { MultiActivityChangeSet } from "@/lib/collaboration/multi-activity/types";
import { prepareMultiTrainingActivityChangeCommunicationDraft } from "@/lib/collaboration/contextual-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type Params = { params: Promise<{ seriesId: string }> };

function isMultiActivityChangeSet(value: unknown): value is MultiActivityChangeSet {
  if (!value || typeof value !== "object") return false;
  const row = value as MultiActivityChangeSet;
  return (
    row.domain === "TRAINING" &&
    typeof row.batchOperationId === "string" &&
    typeof row.teamId === "string" &&
    typeof row.batchFingerprint === "string" &&
    Array.isArray(row.changeSets)
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([PERMISSIONS.COMMUNICATION_TEAM_SEND]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const senderUserId = auth.session.user.effectiveUserId ?? auth.session.user.id;
  const { seriesId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || !isMultiActivityChangeSet(body.multiChangeSet)) {
    return NextResponse.json({ error: "multiChangeSet is required" }, { status: 400 });
  }

  try {
    const result = await prepareMultiTrainingActivityChangeCommunicationDraft({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      senderUserId,
      trainingSeriesId: seriesId,
      multiChangeSet: body.multiChangeSet,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Communication not permitted" }, { status: 403 });
    }
    if (err instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
