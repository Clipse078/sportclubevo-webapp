import { NextRequest, NextResponse } from "next/server";
import {
  listPlayerReleaseRequestsForSourceTeamSeason,
} from "@/lib/match-squad/player-release-request-service";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { resolvePlayerReleaseRouteAccess } from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRequestRouteError(
      new PlayerReleaseForbiddenError("Keine Berechtigung, Anfragen zu prüfen."),
    );
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam === "ALL"
      ? undefined
      : statusParam === "PENDING"
        ? ("PENDING_ONLY" as const)
        : ("PENDING_ONLY" as const);

  try {
    const requests = await listPlayerReleaseRequestsForSourceTeamSeason({
      tenantId: resolved.tenant.id,
      sourceTeamSeasonId: teamSeasonId,
      status,
    });
    return NextResponse.json({ requests, canDecide: resolved.access.canManageSource });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
