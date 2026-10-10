/**
 * POST /api/matchcenter/[matchId]/participation-response
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — trainer-recorded match availability.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ParticipationResponseStatus } from "@prisma/client";
import { respondToParticipation } from "@/lib/participation/participation-service";
import { toParticipationEventRef } from "@/lib/participation/event-reference";
import {
  ParticipationEventNotFoundError,
  ParticipationTenantMismatchError,
  ParticipationValidationError,
} from "@/lib/participation/errors";
import { resolveAccessForMatch } from "@/lib/match-squad/match-squad-route-access";
import { assertMatchSquadMutationAllowed } from "@/lib/match-squad/auth";
import { MatchSquadError } from "@/lib/match-squad/errors";
import {
  canRespondToMatchAvailability,
  matchAvailabilityReadOnlyReason,
} from "@/lib/match-squad/match-availability-lifecycle";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ matchId: string }> };

function mapError(error: unknown): NextResponse {
  if (error instanceof MatchSquadError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof ParticipationValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof ParticipationTenantMismatchError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ParticipationEventNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  throw error;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    assertMatchSquadMutationAllowed(resolved.access);
  } catch (error) {
    return mapError(error);
  }

  const event = await prisma.event.findFirst({
    where: { id: matchId, tenantId: resolved.tenant.id, type: "MATCH" },
    select: { startAt: true, status: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  }

  const lifecycle = { status: event.status, startAt: event.startAt };
  const readOnlyReason = matchAvailabilityReadOnlyReason(lifecycle);
  if (readOnlyReason) {
    return NextResponse.json({ error: readOnlyReason }, { status: 400 });
  }
  if (!canRespondToMatchAvailability(lifecycle)) {
    return NextResponse.json({ error: "Rückmeldung nicht mehr möglich." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  const personId = String(body.personId ?? "").trim();
  const status = String(body.status ?? "") as ParticipationResponseStatus;
  if (!personId) {
    return NextResponse.json({ error: "Spieler fehlt." }, { status: 400 });
  }

  try {
    const response = await respondToParticipation(resolved.tenant.id, resolved.userId, {
      personId,
      teamSeasonId: resolved.access.teamSeasonId,
      event: toParticipationEventRef({ eventKind: "MATCH", eventId: matchId }),
      status,
      note: body.note == null ? null : String(body.note),
      responseSource: "TRAINER",
    });
    return NextResponse.json(response);
  } catch (error) {
    return mapError(error);
  }
}
