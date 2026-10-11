import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { resolveAccessForMatch } from "@/lib/match-squad/match-squad-route-access";
import { resolvePlayerReleaseTargetViewAccess } from "@/lib/match-squad/player-release-auth";
import { resolveMatchReleasedPlayersContext } from "@/lib/match-squad/activity-released-players-context";
import { discoverReleasedPlayersForTargetActivity } from "@/lib/match-squad/player-release-discovery-service";
import { createPlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { PlayerReleaseRequestForbiddenError } from "@/lib/match-squad/player-release-request-errors";

type Params = { params: Promise<{ matchId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const viewAuth = await requireApiAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
  ]);
  if (!viewAuth.ok) {
    return NextResponse.json({ error: viewAuth.error }, { status: viewAuth.status });
  }

  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    const activity = await resolveMatchReleasedPlayersContext(resolved.tenant.id, matchId);
    const canDiscover = await resolvePlayerReleaseTargetViewAccess({
      userId: resolved.userId,
      tenantId: resolved.tenant.id,
      tenantKey: resolved.tenant.key,
      targetTeamSeasonId: activity.targetTeamSeasonId,
    });
    if (!canDiscover) {
      return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
    }

    const players = await discoverReleasedPlayersForTargetActivity({
      tenantId: resolved.tenant.id,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      targetEventId: activity.targetEventId,
      targetEventType: "MATCH",
      targetActivityStartAt: activity.targetActivityStartAt,
      targetEndAt: activity.targetEndAt,
      timezone: (await getActiveTenant())?.timezone ?? "Europe/Zurich",
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
  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canEdit) {
    return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
  }

  const body = await request.json().catch(() => null);
  if (!body?.playerReleaseId) {
    return NextResponse.json({ error: "playerReleaseId fehlt." }, { status: 400 });
  }

  try {
    const activity = await resolveMatchReleasedPlayersContext(resolved.tenant.id, matchId);
    const canRequest = await resolvePlayerReleaseTargetViewAccess({
      userId: resolved.userId,
      tenantId: resolved.tenant.id,
      tenantKey: resolved.tenant.key,
      targetTeamSeasonId: activity.targetTeamSeasonId,
    });
    if (!canRequest) {
      return mapPlayerReleaseRequestRouteError(new PlayerReleaseRequestForbiddenError());
    }

    const created = await createPlayerReleaseRequest({
      tenantId: resolved.tenant.id,
      actorUserId: resolved.userId,
      targetTeamSeasonId: activity.targetTeamSeasonId,
      targetEventId: activity.targetEventId,
      targetEventType: "MATCH",
      targetActivityStartAt: activity.targetActivityStartAt,
      targetEndAt: activity.targetEndAt,
      timezone: (await getActiveTenant())?.timezone ?? "Europe/Zurich",
      playerReleaseId: String(body.playerReleaseId),
      requestedMinutes: body.requestedMinutes,
      requestNote: body.requestNote,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
