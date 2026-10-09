/**
 * POST /api/collaboration/matches/[matchId]/prepare-communication
 * SCE-COLLAB-01B — prepared team announcement draft for match activity changes.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import type { ActivityChangeSet } from "@/lib/collaboration/activity-change/types";
import { prepareMatchActivityChangeCommunicationDraft } from "@/lib/collaboration/contextual-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type Params = { params: Promise<{ matchId: string }> };

function isActivityChangeSet(value: unknown): value is ActivityChangeSet {
  if (!value || typeof value !== "object") return false;
  const row = value as ActivityChangeSet;
  return (
    row.domain === "MATCH" &&
    typeof row.activityId === "string" &&
    typeof row.fingerprint === "string" &&
    Array.isArray(row.entries)
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
  const { matchId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || !isActivityChangeSet(body.changeSet)) {
    return NextResponse.json({ error: "changeSet is required" }, { status: 400 });
  }

  if (body.changeSet.activityId !== matchId) {
    return NextResponse.json({ error: "changeSet activity mismatch" }, { status: 400 });
  }

  try {
    const result = await prepareMatchActivityChangeCommunicationDraft({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      senderUserId,
      matchId,
      changeSet: body.changeSet,
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
