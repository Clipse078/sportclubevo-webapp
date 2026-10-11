import { NextRequest, NextResponse } from "next/server";
import {
  buildPlayerReleasePlan,
  createPlayerReleasePlan,
} from "@/lib/match-squad/player-release-planning-service";
import {
  mapPlayerReleaseRouteError,
  resolvePlayerReleaseRouteAccess,
} from "@/lib/match-squad/player-release-route-access";
import { PlayerReleaseForbiddenError } from "@/lib/match-squad/player-release-errors";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

function parsePersonIds(body: Record<string, unknown>): string[] {
  return Array.isArray(body.personIds) ? body.personIds.map((value) => String(value)) : [];
}

function parseEventIds(body: Record<string, unknown>): string[] {
  return Array.isArray(body.eventIds) ? body.eventIds.map((value) => String(value)) : [];
}

export async function POST(request: NextRequest, context: Context) {
  const { teamId, teamSeasonId } = await context.params;
  const resolved = await resolvePlayerReleaseRouteAccess({ teamId, teamSeasonId });
  if (!resolved.ok) return resolved.response;

  if (!resolved.access.canManageSource) {
    return mapPlayerReleaseRouteError(new PlayerReleaseForbiddenError());
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const action = String(body.action ?? "review").trim().toLowerCase();
  const timezone = resolved.tenant.timezone ?? "Europe/Zurich";

  const sourceEventId =
    typeof body.sourceEventId === "string" && body.sourceEventId.trim()
      ? body.sourceEventId.trim()
      : undefined;

  const shared = {
    tenantId: resolved.tenant.id,
    teamId,
    sourceTeamSeasonId: teamSeasonId,
    personIds: parsePersonIds(body),
    eventIds: parseEventIds(body),
    timezone,
    sourceEventId,
    defaultReason: body.defaultReason != null ? String(body.defaultReason) : undefined,
    activityDefaults: body.activityDefaults as Record<string, { maxMinutes?: number | null; reason?: string }> | undefined,
    excludedCombinations: body.excludedCombinations as { personId: string; eventId: string }[] | undefined,
    combinationOverrides: body.combinationOverrides as
      | { personId: string; eventId: string; maxMinutes?: number | null; reason?: string }[]
      | undefined,
  };

  try {
    if (action === "create") {
      const result = await createPlayerReleasePlan({
        ...shared,
        actorUserId: resolved.userId,
      });
      return NextResponse.json(result, { status: 201 });
    }

    const review = await buildPlayerReleasePlan(shared);
    return NextResponse.json({ review });
  } catch (error) {
    return mapPlayerReleaseRouteError(error);
  }
}
