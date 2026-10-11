import { NextRequest, NextResponse } from "next/server";
import { cancelPlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import { resolveAccessForMatch } from "@/lib/match-squad/match-squad-route-access";
import { resolveMatchReleasedPlayersContext } from "@/lib/match-squad/activity-released-players-context";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { PlayerReleaseRequestForbiddenError } from "@/lib/match-squad/player-release-request-errors";

type Params = { params: Promise<{ matchId: string; requestId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { matchId, requestId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;
  if (!resolved.access.canEdit) {
    return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
  }

  const body = await request.json().catch(() => ({}));

  try {
    const activity = await resolveMatchReleasedPlayersContext(resolved.tenant.id, matchId);
    const updated = await cancelPlayerReleaseRequest({
      tenantId: resolved.tenant.id,
      requestId,
      actorUserId: resolved.userId,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      expectedVersion: body?.expectedVersion,
    });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
