/**
 * Presentation-only Spielplan loader — no feasibility / Smart Timing / optimiser.
 */

import { getTournament } from "@/lib/tournaments/tournament-service";
import { buildTournamentPlanungViewModel } from "@/lib/tournaments/planung/build-planung-view-model";
import { loadPublicPlanungSnapshot } from "@/lib/tournaments/public/load-public-tournament-view-model.server";
import { buildTournamentSpielplanFromPlanung } from "./build-tournament-spielplan-view-model";
import type { TournamentSpielplanViewModel } from "./types";

export async function loadTournamentSpielplanViewModel(params: {
  tenantId: string;
  tournamentId: string;
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
}): Promise<TournamentSpielplanViewModel> {
  const [tournamentDto, snapshot] = await Promise.all([
    getTournament(params.tenantId, params.tournamentId),
    loadPublicPlanungSnapshot(params),
  ]);

  const planung = buildTournamentPlanungViewModel({
    ...snapshot,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    regenerationMetrics: undefined,
  });

  return buildTournamentSpielplanFromPlanung({
    tournamentId: params.tournamentId,
    title: tournamentDto.title,
    startAtIso: tournamentDto.startAt,
    location: tournamentDto.location,
    organizerName: tournamentDto.organizerName,
    tenantName: params.tenantName,
    tenantLogoUrl: params.tenantLogoUrl,
    timezone: params.timezone,
    pitches: planung.pitches.map((p) => ({
      pitchId: p.pitchId,
      displayOrder: p.displayOrder,
      label: p.label,
    })),
    cells: planung.cells,
    scheduleSections: planung.scheduleSections,
    participants: snapshot.participants.map((p) => ({
      participantId: p.participantId,
      displayName: p.displayName,
      crestUrl: p.crestUrl,
    })),
  });
}
