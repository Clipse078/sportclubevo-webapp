/**
 * POST /api/collaboration/training-sessions/[sessionId]/publish-communication
 *
 * SCE-COLLAB-01A — publish a prepared activity-change draft (explicit user action).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { publishPreparedTrainingActivityChangeCommunication } from "@/lib/collaboration/contextual-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { mapContextualCommunicationValidationError } from "@/lib/collaboration/contextual-communication-http";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([PERMISSIONS.COMMUNICATION_TEAM_SEND]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const senderUserId = auth.session.user.effectiveUserId ?? auth.session.user.id;
  const { sessionId: _sessionId } = await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.draftId !== "string" || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "draftId and teamId are required" }, { status: 400 });
  }

  try {
    const result = await publishPreparedTrainingActivityChangeCommunication({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      senderUserId,
      teamId: body.teamId.trim(),
      draftId: body.draftId.trim(),
      subject: typeof body.subject === "string" ? body.subject : null,
      bodyText: typeof body.bodyText === "string" ? body.bodyText : null,
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
