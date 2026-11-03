/**
 * lib/integrations/sfv/standings-table.ts
 *
 * Pure SFV adapter for resolving the authoritative ranking table for a team.
 * Position values come from SFV and are never recalculated locally.
 */

import type { ClubRankingEntry } from "./client";
import type {
  SportingStandingsCompetition,
  SportingStandingRow,
  SportingStandingsTable,
} from "@/lib/sporting-data/standings-types";
import type { StandingsTableCompetitionHint } from "./standings-competition-identity";

export type StandingsTableResolutionInput = {
  entries: readonly ClubRankingEntry[];
  externalTeamId: number;
  providerLeagueId?: number | null;
  /** Schedule-derived or snapshot-refined division/group when available. */
  competitionHint?: StandingsTableCompetitionHint | null;
};

type TableTuple = {
  leagueId: number;
  divisionId: number;
  groupId: number;
};

function tableTuple(entry: ClubRankingEntry): TableTuple {
  return {
    leagueId: entry.leagueId,
    divisionId: entry.divisionId,
    groupId: entry.groupId,
  };
}

function tuplesEqual(left: TableTuple, right: TableTuple): boolean {
  return (
    left.leagueId === right.leagueId &&
    left.divisionId === right.divisionId &&
    left.groupId === right.groupId
  );
}

function compareTableTuples(left: TableTuple, right: TableTuple): number {
  if (left.leagueId !== right.leagueId) {
    return left.leagueId - right.leagueId;
  }

  if (left.divisionId !== right.divisionId) {
    return left.divisionId - right.divisionId;
  }

  return left.groupId - right.groupId;
}

/**
 * When SFV returns multiple anchor tables in the same league/division, group id 0
 * is a generic aggregate — prefer a specific provider group when still ambiguous.
 */
function compareAnchorEntries(
  left: ClubRankingEntry,
  right: ClubRankingEntry,
): number {
  const leftTuple = tableTuple(left);
  const rightTuple = tableTuple(right);

  if (
    leftTuple.leagueId === rightTuple.leagueId &&
    leftTuple.divisionId === rightTuple.divisionId
  ) {
    const leftGeneric = leftTuple.groupId === 0;
    const rightGeneric = rightTuple.groupId === 0;
    if (leftGeneric !== rightGeneric) {
      return leftGeneric ? 1 : -1;
    }
  }

  return compareTableTuples(leftTuple, rightTuple);
}

function filterAnchorsByCompetitionHint(
  anchors: ClubRankingEntry[],
  hint: StandingsTableCompetitionHint | null | undefined,
): ClubRankingEntry[] {
  if (!hint) {
    return anchors;
  }

  let filtered = anchors;

  if (
    hint.providerDivisionId != null &&
    Number.isInteger(hint.providerDivisionId)
  ) {
    filtered = filtered.filter(
      (entry) => entry.divisionId === hint.providerDivisionId,
    );
  }

  if (
    hint.providerGroupId != null &&
    Number.isInteger(hint.providerGroupId) &&
    hint.providerGroupId > 0
  ) {
    filtered = filtered.filter((entry) => entry.groupId === hint.providerGroupId);
  }

  return filtered;
}

function selectAnchorEntry(
  anchors: ClubRankingEntry[],
  providerLeagueId: number | null | undefined,
  competitionHint: StandingsTableCompetitionHint | null | undefined,
): ClubRankingEntry | null {
  if (anchors.length === 0) {
    return null;
  }

  let candidates = anchors;

  if (providerLeagueId != null) {
    const leagueMatches = candidates.filter(
      (entry) => entry.leagueId === providerLeagueId,
    );
    if (leagueMatches.length > 0) {
      candidates = leagueMatches;
    }
  }

  const hinted = filterAnchorsByCompetitionHint(candidates, competitionHint);
  if (hinted.length > 0) {
    candidates = hinted;
  }

  if (candidates.length === 1) {
    return candidates[0]!;
  }

  return [...candidates].sort(compareAnchorEntries)[0]!;
}

function meaningfulName(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapRow(entry: ClubRankingEntry): SportingStandingRow {
  return {
    position: entry.position,
    externalTeamId: entry.teamId,
    teamName: meaningfulName(entry.teamName) ?? `Team ${entry.teamId}`,
    shortName: null,
    played: entry.matches,
    won: entry.wins,
    drawn: entry.draws,
    lost: entry.losses,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    points: entry.points,
    penaltyPoints: entry.penaltyPoints,
  };
}

function buildCompetition(
  anchor: ClubRankingEntry,
): SportingStandingsCompetition {
  return {
    name: meaningfulName(anchor.leagueName) ?? "League",
    divisionName: meaningfulName(anchor.divisionName),
    groupName: meaningfulName(anchor.groupName),
  };
}

export type ResolvedStandingsTable = {
  standings: SportingStandingsTable;
  sfvLeagueId: number;
  sfvDivisionId: number;
  sfvGroupId: number;
};

/**
 * Resolves the authoritative ranking table and the SFV table identity tuple.
 */
export function resolveStandingsTableWithIdentity(
  input: StandingsTableResolutionInput,
): ResolvedStandingsTable | null {
  const standings = resolveStandingsTable(input);
  if (!standings) {
    return null;
  }

  const anchors = input.entries.filter(
    (entry) => entry.teamId === input.externalTeamId,
  );
  if (anchors.length === 0) {
    return null;
  }

  const selectedAnchor = selectAnchorEntry(
    anchors,
    input.providerLeagueId,
    input.competitionHint,
  );
  if (!selectedAnchor) {
    return null;
  }

  const anchorTuple = tableTuple(selectedAnchor);

  return {
    standings,
    sfvLeagueId: anchorTuple.leagueId,
    sfvDivisionId: anchorTuple.divisionId,
    sfvGroupId: anchorTuple.groupId,
  };
}

/**
 * Resolves the authoritative ranking table for a mapped external team.
 *
 * Returns null when the team does not appear in any ranking table.
 */
export function resolveStandingsTable(
  input: StandingsTableResolutionInput,
): SportingStandingsTable | null {
  const anchors = input.entries.filter(
    (entry) => entry.teamId === input.externalTeamId,
  );

  if (anchors.length === 0) {
    return null;
  }

  const selectedAnchor = selectAnchorEntry(
    anchors,
    input.providerLeagueId,
    input.competitionHint,
  );
  if (!selectedAnchor) {
    return null;
  }

  const anchorTuple = tableTuple(selectedAnchor);
  const tableRows = input.entries
    .filter((entry) => tuplesEqual(tableTuple(entry), anchorTuple))
    .sort((left, right) => left.position - right.position)
    .map(mapRow);

  return {
    competition: buildCompetition(selectedAnchor),
    rows: tableRows,
  };
}
