import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { cancelPlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import { resolveAccessForTournamentSquad } from "@/lib/match-squad/tournament-squad-route-access";
import { resolveTournamentReleasedPlayersContext } from "@/lib/match-squad/activity-released-players-context";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { PlayerReleaseRequestForbiddenError } from "@/lib/match-squad/player-release-request-errors";

type Params = { params: Promise<{ tournamentId: string; requestId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { tournamentId, requestId } = await params;
  const userId = session.user.effectiveUserId ?? session.user.id;
  const resolved = await resolveAccessForTournamentSquad(tournamentId);
  if (!resolved.ok) return resolved.response;
  if (!resolved.access.canEdit) {
    return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
  }

  const body = await request.json().catch(() => ({}));

  try {
    const activity = await resolveTournamentReleasedPlayersContext(tenant.id, tournamentId);
    const updated = await cancelPlayerReleaseRequest({
      tenantId: tenant.id,
      requestId,
      actorUserId: userId,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      expectedVersion: body?.expectedVersion,
    });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
