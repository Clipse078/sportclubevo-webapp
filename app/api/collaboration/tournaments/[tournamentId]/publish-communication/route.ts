/**
 * POST /api/collaboration/tournaments/[tournamentId]/publish-communication
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { publishPreparedTournamentActivityChangeCommunication } from "@/lib/collaboration/contextual-communication-service";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type Params = { params: Promise<{ tournamentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireApiAnyPermission([PERMISSIONS.COMMUNICATION_TEAM_SEND]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const senderUserId = auth.session.user.effectiveUserId ?? auth.session.user.id;
  await params;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.draftId !== "string" || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "draftId and teamId are required" }, { status: 400 });
  }

  try {
    const result = await publishPreparedTournamentActivityChangeCommunication({
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
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
