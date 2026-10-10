/**
 * POST /api/matchcenter/[matchId]/participation-response
 *
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — was trainer-recorded match availability.
 * R2.2: Match availability responses are written only by authorized player-side
 * accounts (player/parent/guardian via personal-action flows). Trainers request
 * and read availability; they do not mutate ParticipationResponse here.
 *
 * Unrelated trainer participation flows (e.g. other event types / team APIs)
 * remain on their existing routes.
 */

import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ matchId: string }> };

export async function POST(_request: NextRequest, { params: _params }: Params) {
  return NextResponse.json(
    {
      error:
        "Verfügbarkeits-Rückmeldungen werden vom Spieler bzw. berechtigtem Konto erfasst — nicht vom Trainer im Aufgebot.",
      code: "MATCH_AVAILABILITY_TRAINER_WRITE_DISABLED",
    },
    { status: 403 },
  );
}
