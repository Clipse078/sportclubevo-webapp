/**
 * lib/tournaments/team-participation.ts
 *
 * Canonical tenant-team participation for a tournament — participants list
 * first, legacy Event.teamId as fallback. Pure helpers for filters/grouping.
 */

import type { TournamentDto, TournamentTeamReference } from "./types";

/** Distinct tenant teams participating in a tournament (participants, then legacy team). */
export function getTournamentParticipatingTeams(
  tournament: Pick<TournamentDto, "participants" | "team">,
): TournamentTeamReference[] {
  const byId = new Map<string, TournamentTeamReference>();

  for (const participant of tournament.participants) {
    if (participant.kind === "TEAM" && participant.team) {
      byId.set(participant.team.id, participant.team);
    }
  }

  if (tournament.team && !byId.has(tournament.team.id)) {
    byId.set(tournament.team.id, tournament.team);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function tournamentMatchesTeamFilter(
  tournament: Pick<TournamentDto, "participants" | "team">,
  teamId: string,
): boolean {
  return getTournamentParticipatingTeams(tournament).some((team) => team.id === teamId);
}

/** Compact label for list rows — first team or count summary. */
export function formatTournamentTeamsLabel(
  tournament: Pick<TournamentDto, "participants" | "team">,
): { primary: string | null; extraCount: number; allLabels: string[] } {
  const teams = getTournamentParticipatingTeams(tournament);
  if (teams.length === 0) {
    return { primary: null, extraCount: 0, allLabels: [] };
  }

  return {
    primary: teams[0]!.name,
    extraCount: Math.max(0, teams.length - 1),
    allLabels: teams.map((t) => t.name),
  };
}
