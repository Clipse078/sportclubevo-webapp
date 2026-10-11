import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveAccessForTournamentSquad } from "@/lib/match-squad/tournament-squad-route-access";
import { resolvePlayerReleaseTargetViewAccess } from "@/lib/match-squad/player-release-auth";
import { resolveTournamentReleasedPlayersContext } from "@/lib/match-squad/activity-released-players-context";
import { discoverReleasedPlayersForTargetActivity } from "@/lib/match-squad/player-release-discovery-service";
import { createPlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { PlayerReleaseRequestForbiddenError } from "@/lib/match-squad/player-release-request-errors";

type Params = { params: Promise<{ tournamentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { tournamentId } = await params;
  const userId = session.user.effectiveUserId ?? session.user.id;
  const resolved = await resolveAccessForTournamentSquad(tournamentId);
  if (!resolved.ok) return resolved.response;

  try {
    const activity = await resolveTournamentReleasedPlayersContext(tenant.id, tournamentId);
    const canDiscover = await resolvePlayerReleaseTargetViewAccess({
      userId,
      tenantId: tenant.id,
      tenantKey: tenant.key,
      targetTeamSeasonId: activity.targetTeamSeasonId,
    });
    if (!canDiscover) {
      return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
    }

    const players = await discoverReleasedPlayersForTargetActivity({
      tenantId: tenant.id,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      targetEventId: activity.targetEventId,
      targetEventType: "TOURNAMENT",
      targetActivityStartAt: activity.targetActivityStartAt,
      targetEndAt: activity.targetEndAt,
      timezone: tenant.timezone ?? "Europe/Zurich",
    });

    return NextResponse.json({
      eventId: activity.targetEventId,
      eventTitle: activity.eventTitle,
      teamSeasonId: activity.targetTeamSeasonId,
      canRequest: resolved.access.canEdit,
      players,
    });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const { tournamentId } = await params;
  const userId = session.user.effectiveUserId ?? session.user.id;
  const resolved = await resolveAccessForTournamentSquad(tournamentId);
  if (!resolved.ok) return resolved.response;
  if (!resolved.access.canEdit) {
    return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
  }

  const body = await request.json().catch(() => null);
  if (!body?.playerReleaseId) {
    return NextResponse.json({ error: "playerReleaseId fehlt." }, { status: 400 });
  }

  try {
    const activity = await resolveTournamentReleasedPlayersContext(tenant.id, tournamentId);
    const canRequest = await resolvePlayerReleaseTargetViewAccess({
      userId,
      tenantId: tenant.id,
      tenantKey: tenant.key,
      targetTeamSeasonId: activity.targetTeamSeasonId,
    });
    if (!canRequest) {
      return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
    }

    const created = await createPlayerReleaseRequest({
      tenantId: tenant.id,
      actorUserId: userId,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      targetEventId: activity.targetEventId,
      targetEventType: "TOURNAMENT",
      targetActivityStartAt: activity.targetActivityStartAt,
      targetEndAt: activity.targetEndAt,
      timezone: tenant.timezone ?? "Europe/Zurich",
      playerReleaseId: String(body.playerReleaseId),
      requestedMinutes: body.requestedMinutes,
      requestNote: body.requestNote,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
