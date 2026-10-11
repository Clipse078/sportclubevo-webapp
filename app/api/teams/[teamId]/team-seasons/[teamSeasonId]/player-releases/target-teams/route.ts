import { NextRequest, NextResponse } from "next/server";
import { listTargetTeamSeasonOptionsForPerson } from "@/lib/match-squad/player-release-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  const personId = request.nextUrl.searchParams.get("personId")?.trim() ?? "";
  if (!personId) {
    return NextResponse.json({ error: "personId ist erforderlich." }, { status: 400 });
  }

  try {
    const targetOptions = await listTargetTeamSeasonOptionsForPerson({
      tenantId: resolved.tenant.id,
      personId,
      sourceTeamSeasonId: teamSeasonId,
    });
    return NextResponse.json({ targetOptions });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
