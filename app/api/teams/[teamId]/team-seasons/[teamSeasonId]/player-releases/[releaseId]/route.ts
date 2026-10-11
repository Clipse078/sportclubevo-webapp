import { NextRequest, NextResponse } from "next/server";
import { updatePlayerRelease } from "@/lib/match-squad/player-release-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string; releaseId: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId, releaseId } = await context.params;
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
    const release = await updatePlayerRelease({
      tenantId: resolved.tenant.id,
      teamId,
      sourceTeamSeasonId: teamSeasonId,
      releaseId,
      actorUserId: resolved.userId,
      validFrom: body.validFrom !== undefined ? String(body.validFrom) : undefined,
      validUntil: body.validUntil !== undefined ? String(body.validUntil) : undefined,
      maxMinutes: body.maxMinutes,
      reason: body.reason !== undefined ? String(body.reason) : undefined,
      note: body.note,
      expectedVersion:
        typeof body.expectedVersion === "string" ? body.expectedVersion : undefined,
    });
    return NextResponse.json({ release });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
