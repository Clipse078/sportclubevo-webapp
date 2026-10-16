/**
 * SCE Tournament Planner — tenant-organiser eligibility (01E1).
 *
 * Planner ownership follows tournament organiser identity, not physical venue.
 * In SCE, `Event.homeAway` for type=TOURNAMENT encodes organiser ownership:
 * - HOME → tenant organises (Eigenes Turnier) → planner allowed
 * - AWAY → external organiser (Auswärtsturnier) → planner forbidden for tenant
 *
 * Aligns with `isTenantHostedTournament` / Tournament Creator organiser semantics.
 */

import type { TournamentHomeAway } from "@/lib/tournaments/types";
import { isTenantHostedTournament } from "@/lib/tournaments/management-view";

/** Authoritative resolver for Tournament Planner eligibility. */
export function canTenantPlanTournament(
  tournament: Pick<{ homeAway: TournamentHomeAway }, "homeAway">,
): boolean {
  return isTenantHostedTournament(tournament);
}

/** Normalises raw Event.homeAway (null/unset → HOME, matching tournament-service). */
export function normalizeTournamentOrganiserHomeAway(
  homeAway: string | null | undefined,
): TournamentHomeAway {
  return homeAway?.trim().toUpperCase() === "AWAY" ? "AWAY" : "HOME";
}
