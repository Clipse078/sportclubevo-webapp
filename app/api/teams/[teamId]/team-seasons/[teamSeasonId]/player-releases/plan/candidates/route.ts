import { NextRequest, NextResponse } from "next/server";
import { resolvePlayerReleasePlanningCandidates } from "@/lib/match-squad/player-release-planning-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRouteError(new PlayerReleaseForbiddenError());
  }

  const body = await request.json().catch(() => null);
  const personIds = Array.isArray(body?.personIds)
    ? body.personIds.map((value: unknown) => String(value))
    : [];

  try {
    const payload = await resolvePlayerReleasePlanningCandidates({
      tenantId: resolved.tenant.id,
      sourceTeamSeasonId: teamSeasonId,
      personIds,
      timezone: resolved.tenant.timezone ?? "Europe/Zurich",
    });
    return NextResponse.json(payload);
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
