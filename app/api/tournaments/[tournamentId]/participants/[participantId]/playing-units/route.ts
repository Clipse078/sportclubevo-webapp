/**
 * GET/POST /api/tournaments/[tournamentId]/participants/[participantId]/playing-units
 *
 * SCE-TOURNAMENT-PLANNER-02C — tournament-local Spielteams.
 * Permission: EVENTS_MANAGE (mutations); read allowed for same permission as Planung edit.
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTournamentParticipant } from "@/lib/tournaments/participant-service";
import { TournamentParticipantNotFoundError } from "@/lib/tournaments/errors";
import {
  createTournamentParticipantUnit,
  listTournamentParticipantUnits,
  resolveEffectivePlayingUnits,
  splitParticipantIntoDefaultSubunits,
} from "@/lib/tournament-scheduling/tournament-participant-unit-service";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { mapPlayingUnitsPersistenceError } from "@/lib/tournament-scheduling/playing-units-route-errors";

type RouteContext = { params: Promise<{ tournamentId: string; participantId: string }> };

function mapUnitDto(
  unit: Awaited<ReturnType<typeof listTournamentParticipantUnits>>[number],
) {
  return {
    id: unit.id,
    tournamentParticipantId: unit.tournamentParticipantId,
    displayName: unit.displayName,
    mode: unit.mode,
    capacityPartitionKey: unit.capacityPartitionKey,
    displayOrder: unit.displayOrder,
    isPersisted: unit.isPersisted,
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, participantId } = await params;

  try {
    const participant = await getTournamentParticipant(tenantId, participantId);
    if (participant.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
    }

    const persisted = await listTournamentParticipantUnits(tenantId, tournamentId, participantId);
    const effective = resolveEffectivePlayingUnits(
      {
        id: participant.id,
        tournamentId: participant.tournamentId,
        displayName: participant.displayName,
      },
      persisted,
    );

    return NextResponse.json({
      persistedUnits: persisted.map(mapUnitDto),
      effectiveUnits: effective.map(mapUnitDto),
      usesImplicitFullTeam: persisted.length === 0,
    });
  } catch (err) {
    if (err instanceof TournamentParticipantNotFoundError) {
      return NextResponse.json(
        { error: "Teilnehmer nicht gefunden.", errorKind: "not_found" },
        { status: 404 },
      );
    }
    const mapped = mapPlayingUnitsPersistenceError(err, "load");
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, errorKind: mapped.errorKind },
        { status: mapped.status },
      );
    }
    throw err;
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, participantId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const participant = await getTournamentParticipant(tenantId, participantId);
    if (participant.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
    }

    if (body.action === "split-default") {
      const units = await splitParticipantIntoDefaultSubunits(
        tenantId,
        tournamentId,
        participantId,
        typeof body.baseDisplayName === "string" ? body.baseDisplayName : participant.displayName,
      );
      revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);
      return NextResponse.json({ units: units.map(mapUnitDto) });
    }

    const displayName = typeof body.displayName === "string" ? body.displayName : "";
    const mode =
      body.mode === "FULL" || body.mode === "SUBUNIT" ? body.mode : undefined;
    const capacityPartitionKey =
      typeof body.capacityPartitionKey === "string" ? body.capacityPartitionKey : undefined;

    const unit = await createTournamentParticipantUnit(tenantId, tournamentId, participantId, {
      displayName,
      mode,
      capacityPartitionKey,
    });

    revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);

    return NextResponse.json({ unit: mapUnitDto(unit) });
  } catch (err) {
    if (err instanceof TournamentParticipantNotFoundError) {
      return NextResponse.json(
        { error: "Teilnehmer nicht gefunden.", errorKind: "not_found" },
        { status: 404 },
      );
    }
    if (err instanceof TournamentSchedulingError) {
      return NextResponse.json(
        { error: err.message, errorKind: "mutation" },
        { status: 400 },
      );
    }
    const mapped = mapPlayingUnitsPersistenceError(err, "mutation");
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, errorKind: mapped.errorKind },
        { status: mapped.status },
      );
    }
    throw err;
  }
}
