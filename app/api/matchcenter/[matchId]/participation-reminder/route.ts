/**
 * POST /api/matchcenter/[matchId]/participation-reminder
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — manual outstanding availability reminder (NOT_RESPONDED only).
 */

import { NextRequest, NextResponse } from "next/server";
import { assertMatchSquadMutationAllowed } from "@/lib/match-squad/auth";
import { MatchSquadError } from "@/lib/match-squad/errors";
import { resolveAccessForMatch } from "@/lib/match-squad/match-squad-route-access";
import { sendMatchAvailabilityOutstandingReminder } from "@/lib/match-squad/match-availability-collection-service";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

type Params = { params: Promise<{ matchId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { matchId } = await params;
  const resolved = await resolveAccessForMatch(matchId);
  if (!resolved.ok) return resolved.response;

  try {
    assertMatchSquadMutationAllowed(resolved.access);
  } catch (error) {
    if (error instanceof MatchSquadError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
    }
    throw error;
  }

  const body = (await request.json().catch(() => ({}))) as { bodyText?: string | null };

  try {
    const result = await sendMatchAvailabilityOutstandingReminder({
      tenantId: resolved.tenant.id,
      userId: resolved.userId,
      eventId: matchId,
      bodyText: body.bodyText,
    });

    if (result.resolvedOutstandingCount === 0) {
      return NextResponse.json({
        ok: true,
        recipientCount: 0,
        message: "Keine ausstehenden Rückmeldungen — Erinnerung nicht gesendet.",
      });
    }

    return NextResponse.json({
      ok: true,
      recipientCount: result.recipientCount,
      communicationId: result.communicationId,
      duplicate: result.duplicate ?? false,
      outstandingPlayerCount: result.resolvedOutstandingCount,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Anfrage konnte nicht gesendet werden." }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Anfrage konnte nicht gesendet werden.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
