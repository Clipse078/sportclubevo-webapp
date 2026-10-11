/**
 * GET/PUT /api/tournamentcenter/[tournamentId]/activity-squad
 * SCE-ACTIVITY-NAV-01 UAT R2 — Tournament Aufgebot (Hauptteam squad selection).
 */

import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { assertMatchSquadMutationAllowed } from "@/lib/match-squad/auth";
import {
  buildTournamentSquadViewModel,
  setTournamentSquadMembers,
} from "@/lib/match-squad/match-squad-service";
import { mapMatchSquadRouteError } from "@/lib/match-squad/match-squad-route-access";
import { resolveAccessForTournamentSquad } from "@/lib/match-squad/tournament-squad-route-access";
import { MatchSquadError } from "@/lib/match-squad/errors";
import { resolvePlayerReleaseAccess } from "@/lib/match-squad/player-release-auth";

type Params = { params: Promise<{ tournamentId: string }> };

function mapError(error: unknown): NextResponse {
  return mapMatchSquadRouteError(error);
}

export async function GET(_request: NextRequest, { params }: Params) {
  const viewAuth = await requireApiAnyPermission([
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TOURNAMENTS_DELETE,
  ]);
  if (!viewAuth.ok) {
    return NextResponse.json({ error: viewAuth.error }, { status: viewAuth.status });
  }

  const { tournamentId } = await params;
  const resolved = await resolveAccessForTournamentSquad(tournamentId);
  if (!resolved.ok) return resolved.response;

  try {
    const squad = await buildTournamentSquadViewModel(resolved.tenant.id, tournamentId);
    const releaseAccess = squad.teamId
      ? await resolvePlayerReleaseAccess({
          userId: resolved.userId,
          tenantId: resolved.tenant.id,
          tenantKey: resolved.tenant.key,
          teamId: squad.teamId,
          teamSeasonId: squad.teamSeasonId,
        })
      : null;
    return NextResponse.json({
      ...squad,
      canEdit: resolved.access.canEdit && squad.editable,
      canManageAvailability: resolved.access.canEdit,
      canManageRelease: Boolean(releaseAccess?.canManageSource) && squad.editable,
      releaseReadOnly: !squad.editable,
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { tournamentId } = await params;
  const resolved = await resolveAccessForTournamentSquad(tournamentId);
  if (!resolved.ok) return resolved.response;

  try {
    assertMatchSquadMutationAllowed(resolved.access);
  } catch (error) {
    return mapError(error);
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.selectedPersonIds)) {
    return NextResponse.json(
      { error: "selectedPersonIds (Array) ist erforderlich." },
      { status: 400 },
    );
  }

  try {
    const squad = await setTournamentSquadMembers({
      tenantId: resolved.tenant.id,
      eventId: tournamentId,
      actorUserId: resolved.userId,
      desiredPersonIds: body.selectedPersonIds as string[],
      expectedVersion:
        typeof body.expectedVersion === "string" ? body.expectedVersion : null,
    });
    return NextResponse.json({
      ...squad,
      canEdit: resolved.access.canEdit && squad.editable,
    });
  } catch (error) {
    if (error instanceof MatchSquadError && error.code === "CONFLICT") {
      const latest = await buildTournamentSquadViewModel(resolved.tenant.id, tournamentId);
      return NextResponse.json(
        { error: error.message, code: error.code, squad: latest },
        { status: 409 },
      );
    }
    return mapError(error);
  }
}
