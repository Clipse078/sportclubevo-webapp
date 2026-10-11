import { NextRequest, NextResponse } from "next/server";
import { assignApprovedPlayerReleaseRequest } from "@/lib/match-squad/player-release-assignment-service";
import { resolveAccessForMatch } from "@/lib/match-squad/match-squad-route-access";
import { resolveMatchReleasedPlayersContext } from "@/lib/match-squad/activity-released-players-context";
import { mapPlayerReleaseRequestRouteError } from "@/lib/match-squad/player-release-request-route-access";
import { PlayerReleaseRequestForbiddenError } from "@/lib/match-squad/player-release-request-errors";
import { assertMatchSquadMutationAllowed } from "@/lib/match-squad/auth";

type Params = { params: Promise<{ matchId: string; requestId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { matchId, requestId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    assertMatchSquadMutationAllowed(resolved.access);
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }

  if (!resolved.access.canEdit) {
    return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
  }

  try {
    const activity = await resolveMatchReleasedPlayersContext(resolved.tenant.id, matchId);
    const result = await assignApprovedPlayerReleaseRequest({
      tenantId: resolved.tenant.id,
      requestId,
      targetEventId: matchId,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      activityKind: "MATCH",
      actorUserId: resolved.userId,
      timezone: "Europe/Zurich",
    });
    return NextResponse.json({
      squad: result.squad,
      matchSquadMemberId: result.matchSquadMemberId,
      idempotentReplay: result.idempotentReplay,
    });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
