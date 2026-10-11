import { NextRequest, NextResponse } from "next/server";
import {
  createPlayerRelease,
  listPlayerReleasesForSourceTeamSeason,
} from "@/lib/match-squad/player-release-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  const includeHistory = request.nextUrl.searchParams.get("includeHistory") === "true";

  try {
    const payload = await listPlayerReleasesForSourceTeamSeason({
      tenantId: resolved.tenant.id,
      teamId,
      sourceTeamSeasonId: teamSeasonId,
      timezone: resolved.tenant.timezone ?? "Europe/Zurich",
      includeHistory,
    });

    return NextResponse.json({
      ...payload,
      canEdit: resolved.access.canManageSource,
    });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRouteError(new PlayerReleaseForbiddenError());
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  try {
    const release = await createPlayerRelease({
      tenantId: resolved.tenant.id,
      teamId,
      sourceTeamSeasonId: teamSeasonId,
      actorUserId: resolved.userId,
      personId: String(body.personId ?? ""),
      targetTeamSeasonId: String(body.targetTeamSeasonId ?? ""),
      scope: body.scope != null ? String(body.scope) : undefined,
      eventId: body.eventId != null ? String(body.eventId) : null,
      trainingSessionId:
        body.trainingSessionId != null ? String(body.trainingSessionId) : null,
      validFrom: body.validFrom != null ? String(body.validFrom) : undefined,
      validUntil: body.validUntil != null ? String(body.validUntil) : undefined,
      maxMinutes: body.maxMinutes,
      reason: String(body.reason ?? ""),
      note: body.note,
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
