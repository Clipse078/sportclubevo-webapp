/**
 * Canonical tenant TeamSeason identity for Weekplanner MATCH items.
 *
 * Event.teamSeasonId is authoritative when set, but SFV/provider-synced matches
 * often only carry teamId + seasonId (and resolved matchcenter sides) without
 * a persisted teamSeasonId on the Event row.
 */

import { prisma } from "@/lib/db/prisma";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";

export function teamSeasonLookupKey(teamId: string, seasonId: string): string {
  return `${teamId}:${seasonId}`;
}

/** Tenant-owned canonical Team id for a match summary (never an external opponent). */
export function resolveMatchcenterOwnTeamId(match: MatchcenterMatchSummary): string | null {
  const eventTeamId = match.teamId?.trim();
  if (eventTeamId) return eventTeamId;

  if (match.home.isOwnTeam && match.home.canonicalTeamId) {
    return match.home.canonicalTeamId;
  }
  if (match.away.isOwnTeam && match.away.canonicalTeamId) {
    return match.away.canonicalTeamId;
  }
  return null;
}

export function resolveWeekplannerMatchTeamSeasonId(
  match: MatchcenterMatchSummary,
  teamSeasonIdByTeamAndSeason: ReadonlyMap<string, string>,
): string | null {
  const persisted = match.teamSeasonId?.trim();
  if (persisted) return persisted;

  const teamId = resolveMatchcenterOwnTeamId(match);
  const seasonId = match.seasonId?.trim();
  if (!teamId || !seasonId) return null;

  return teamSeasonIdByTeamAndSeason.get(teamSeasonLookupKey(teamId, seasonId)) ?? null;
}

export async function loadTeamSeasonIdByTeamAndSeasonForMatches(
  tenantId: string,
  matches: readonly MatchcenterMatchSummary[],
): Promise<Map<string, string>> {
  const teamIds = new Set<string>();
  const seasonIds = new Set<string>();

  for (const match of matches) {
    if (match.teamSeasonId?.trim()) continue;
    const teamId = resolveMatchcenterOwnTeamId(match);
    const seasonId = match.seasonId?.trim();
    if (!teamId || !seasonId) continue;
    teamIds.add(teamId);
    seasonIds.add(seasonId);
  }

  if (teamIds.size === 0 || seasonIds.size === 0) return new Map();

  const rows = await prisma.teamSeason.findMany({
    where: {
      teamId: { in: [...teamIds] },
      seasonId: { in: [...seasonIds] },
      team: { tenantId },
    },
    select: { id: true, teamId: true, seasonId: true },
  });

  return new Map(rows.map((row) => [teamSeasonLookupKey(row.teamId, row.seasonId), row.id]));
}
