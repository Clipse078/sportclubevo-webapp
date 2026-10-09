/**
 * POST /api/collaboration/club-events/[eventId]/publish-communication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { publishPreparedClubEventActivityChangeCommunication } from "@/lib/collaboration/contextual-communication-service";
import { mapContextualCommunicationValidationError } from "@/lib/collaboration/contextual-communication-http";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import type { ClubEventCommunicationScope } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";

type Params = { params: Promise<{ eventId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([
    PERMISSIONS.COMMUNICATION_TEAM_SEND,
    PERMISSIONS.COMMUNICATION_CLUB_SEND,
  ]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const senderUserId = auth.session.user.effectiveUserId ?? auth.session.user.id;
  const { eventId: _eventId } = await params;

  const body = (await request.json().catch(() => null)) as {
    draftId?: string;
    teamId?: string | null;
    communicationScope?: ClubEventCommunicationScope;
    subject?: string | null;
    bodyText?: string | null;
  } | null;

  if (!body?.draftId?.trim()) {
    return NextResponse.json({ error: "draftId is required" }, { status: 400 });
  }

  const communicationScope = body.communicationScope ?? (body.teamId ? "TEAM" : "CLUB");

  try {
    const result = await publishPreparedClubEventActivityChangeCommunication({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      senderUserId,
      draftId: body.draftId.trim(),
      communicationScope,
      teamId: body.teamId,
      subject: body.subject,
      bodyText: body.bodyText,
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
      const mapped = mapContextualCommunicationValidationError(err);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    throw err;
  }
}
