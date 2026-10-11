import { NextRequest, NextResponse } from "next/server";
import { decidePlayerReleaseRequest } from "@/lib/match-squad/player-release-request-service";
import {
  mapPlayerReleaseRequestRouteError,
} from "@/lib/match-squad/player-release-request-route-access";
import { resolvePlayerReleaseRouteAccess } from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string; requestId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId, requestId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRequestRouteError(
      new PlayerReleaseForbiddenError("Du hast keine Berechtigung, diese Anfrage zu genehmigen."),
    );
  }

  const body = await request.json().catch(() => null);
  const decision = body?.decision === "REJECT" ? "REJECT" : body?.decision === "APPROVE" ? "APPROVE" : null;
  if (!decision) {
    return NextResponse.json({ error: "decision muss APPROVE oder REJECT sein." }, { status: 400 });
  }

  try {
    const updated = await decidePlayerReleaseRequest({
      tenantId: resolved.tenant.id,
      sourceTeamSeasonId: teamSeasonId,
      requestId,
      actorUserId: resolved.userId,
      decision,
      decisionNote: body?.decisionNote,
      expectedVersion: body?.expectedVersion,
      timezone: resolved.tenant.timezone ?? "Europe/Zurich",
    });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return mapPlayerReleaseRequestRouteError(error);
  }
}
