/**
 * PATCH/DELETE playing unit
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTournamentParticipant } from "@/lib/tournaments/participant-service";
import { TournamentParticipantNotFoundError } from "@/lib/tournaments/errors";
import {
  removeTournamentParticipantUnit,
  updateTournamentParticipantUnit,
} from "@/lib/tournament-scheduling/tournament-participant-unit-service";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import { mapPlayingUnitsPersistenceError } from "@/lib/tournament-scheduling/playing-units-route-errors";

type RouteContext = {
  params: Promise<{ tournamentId: string; participantId: string; unitId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, participantId, unitId } = await params;

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

    const unit = await updateTournamentParticipantUnit(tenantId, tournamentId, participantId, unitId, {
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      mode: body.mode === "FULL" || body.mode === "SUBUNIT" ? body.mode : undefined,
      capacityPartitionKey:
        body.capacityPartitionKey === null || typeof body.capacityPartitionKey === "string"
          ? (body.capacityPartitionKey as string | null)
          : undefined,
    });

    revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);

    return NextResponse.json({
      unit: {
        id: unit.id,
        tournamentParticipantId: unit.tournamentParticipantId,
        displayName: unit.displayName,
        mode: unit.mode,
        capacityPartitionKey: unit.capacityPartitionKey,
        displayOrder: unit.displayOrder,
        isPersisted: unit.isPersisted,
      },
    });
  } catch (err) {
    if (err instanceof TournamentParticipantNotFoundError) {
      return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
    }
    if (err instanceof TournamentSchedulingError) {
      const status = err.code === "TOURNAMENT_PARTICIPANT_UNIT_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: err.message, errorKind: "mutation" },
        { status },
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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const { tournamentId, participantId, unitId } = await params;

  try {
    const participant = await getTournamentParticipant(tenantId, participantId);
    if (participant.tournamentId !== tournamentId) {
      return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
    }

    await removeTournamentParticipantUnit(tenantId, tournamentId, participantId, unitId);
    revalidatePath(`/dashboard/tournamentcenter/${tournamentId}/edit`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TournamentParticipantNotFoundError) {
      return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
    }
    if (err instanceof TournamentSchedulingError) {
      const status = err.code === "TOURNAMENT_PARTICIPANT_UNIT_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: err.message, errorKind: "mutation" },
        { status },
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
