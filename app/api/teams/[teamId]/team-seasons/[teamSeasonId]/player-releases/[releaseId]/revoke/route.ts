import { NextResponse } from "next/server";
import { revokePlayerRelease } from "@/lib/match-squad/player-release-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string; releaseId: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { teamId, teamSeasonId, releaseId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRouteError(new PlayerReleaseForbiddenError());
  }

  try {
    const release = await revokePlayerRelease({
      tenantId: resolved.tenant.id,
      teamId,
      sourceTeamSeasonId: teamSeasonId,
      releaseId,
      actorUserId: resolved.userId,
    });
    return NextResponse.json({ release });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
