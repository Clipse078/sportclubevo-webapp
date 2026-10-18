/**
 * SCE-TOURNAMENT-PLANNER-01J — deterministic tournament group standings (pure).
 */

import type { TournamentRankingTiebreakCriterion } from "../competition-structure/types";

export type { TournamentRankingTiebreakCriterion };

export type TournamentRankingConfigurationInput = {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakOrder: readonly TournamentRankingTiebreakCriterion[];
};

export type GroupStandingFixtureResult = {
  fixtureId: string;
  sideAParticipantId: string;
  sideBParticipantId: string;
  scoreSideA: number;
  scoreSideB: number;
};

export type GroupStandingRow = {
  participantId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** True when position is tied with another row after all tiebreak criteria. */
  tiedAtPosition: boolean;
};

export type GroupStandingsResult = {
  rows: GroupStandingRow[];
  /** Participant ids tied on every configured criterion (display-only ordering applied). */
  perfectlyTiedParticipantIds: ReadonlySet<string>;
};

type MutableStats = {
  participantId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function emptyStats(participantId: string): MutableStats {
  return {
    participantId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
}

function applyResult(
  stats: Map<string, MutableStats>,
  result: GroupStandingFixtureResult,
  config: TournamentRankingConfigurationInput,
): void {
  const a = stats.get(result.sideAParticipantId) ?? emptyStats(result.sideAParticipantId);
  const b = stats.get(result.sideBParticipantId) ?? emptyStats(result.sideBParticipantId);
  a.played += 1;
  b.played += 1;
  a.goalsFor += result.scoreSideA;
  a.goalsAgainst += result.scoreSideB;
  b.goalsFor += result.scoreSideB;
  b.goalsAgainst += result.scoreSideA;

  if (result.scoreSideA > result.scoreSideB) {
    a.won += 1;
    b.lost += 1;
    a.points += config.winPoints;
    b.points += config.lossPoints;
  } else if (result.scoreSideA < result.scoreSideB) {
    b.won += 1;
    a.lost += 1;
    b.points += config.winPoints;
    a.points += config.lossPoints;
  } else {
    a.drawn += 1;
    b.drawn += 1;
    a.points += config.drawPoints;
    b.points += config.drawPoints;
  }
  stats.set(a.participantId, a);
  stats.set(b.participantId, b);
}

function statsFromResults(
  participantIds: readonly string[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): Map<string, MutableStats> {
  const stats = new Map<string, MutableStats>();
  for (const id of participantIds) {
    stats.set(id, emptyStats(id));
  }
  for (const result of results) {
    if (!stats.has(result.sideAParticipantId) || !stats.has(result.sideBParticipantId)) {
      continue;
    }
    applyResult(stats, result, config);
  }
  return stats;
}

function headToHeadPoints(
  participantIds: readonly string[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): Map<string, number> {
  const subset = new Set(participantIds);
  const mini = statsFromResults(
    participantIds,
    results.filter(
      (r) => subset.has(r.sideAParticipantId) && subset.has(r.sideBParticipantId),
    ),
    config,
  );
  return new Map(participantIds.map((id) => [id, mini.get(id)?.points ?? 0]));
}

function headToHeadGoalDifference(
  participantIds: readonly string[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): Map<string, number> {
  const subset = new Set(participantIds);
  const mini = statsFromResults(
    participantIds,
    results.filter(
      (r) => subset.has(r.sideAParticipantId) && subset.has(r.sideBParticipantId),
    ),
    config,
  );
  return new Map(
    participantIds.map((id) => [
      id,
      (mini.get(id)?.goalsFor ?? 0) - (mini.get(id)?.goalsAgainst ?? 0),
    ]),
  );
}

function headToHeadGoalsScored(
  participantIds: readonly string[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): Map<string, number> {
  const subset = new Set(participantIds);
  const mini = statsFromResults(
    participantIds,
    results.filter(
      (r) => subset.has(r.sideAParticipantId) && subset.has(r.sideBParticipantId),
    ),
    config,
  );
  return new Map(participantIds.map((id) => [id, mini.get(id)?.goalsFor ?? 0]));
}

type CompareKey = readonly (string | number)[];

function compareKeysDesc(a: CompareKey, b: CompareKey): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av === bv) continue;
    return av > bv ? -1 : 1;
  }
  return 0;
}

function sortKeyForParticipant(
  participantId: string,
  stats: MutableStats,
  tiedSubset: readonly string[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): CompareKey {
  const keys: (string | number)[] = [];
  for (const criterion of config.tiebreakOrder) {
    if (criterion === "POINTS") {
      keys.push(stats.points);
    } else if (criterion === "GOAL_DIFFERENCE") {
      keys.push(stats.goalsFor - stats.goalsAgainst);
    } else if (criterion === "GOALS_SCORED") {
      keys.push(stats.goalsFor);
    } else if (criterion === "HEAD_TO_HEAD") {
      const h2hPoints = headToHeadPoints(tiedSubset, results, config);
      keys.push(h2hPoints.get(participantId) ?? 0);
      const h2hGd = headToHeadGoalDifference(tiedSubset, results, config);
      keys.push(h2hGd.get(participantId) ?? 0);
      const h2hGs = headToHeadGoalsScored(tiedSubset, results, config);
      keys.push(h2hGs.get(participantId) ?? 0);
    }
  }
  return keys;
}

function findTiedSubsets(
  ordered: { participantId: string; stats: MutableStats }[],
  results: readonly GroupStandingFixtureResult[],
  config: TournamentRankingConfigurationInput,
): string[][] {
  if (ordered.length === 0) return [];
  const subsets: string[][] = [];
  let current: string[] = [ordered[0]!.participantId];

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const next = ordered[i]!;
    const prevKey = sortKeyForParticipant(
      prev.participantId,
      prev.stats,
      current,
      results,
      config,
    );
    const nextKey = sortKeyForParticipant(
      next.participantId,
      next.stats,
      [...current, next.participantId],
      results,
      config,
    );
    if (compareKeysDesc(prevKey, nextKey) === 0) {
      current.push(next.participantId);
    } else {
      if (current.length > 1) subsets.push([...current]);
      current = [next.participantId];
    }
  }
  if (current.length > 1) subsets.push(current);
  return subsets;
}

/**
 * Multi-team head-to-head: mini-league among tied participants using points,
 * goal difference, and goals scored from mutual fixtures only (no nested H2H).
 */
export function calculateTournamentGroupStandings(input: {
  participantIds: readonly string[];
  completedFixtures: readonly GroupStandingFixtureResult[];
  rankingConfiguration: TournamentRankingConfigurationInput;
}): GroupStandingsResult {
  const stats = statsFromResults(
    input.participantIds,
    input.completedFixtures,
    input.rankingConfiguration,
  );

  let ordered = input.participantIds.map((participantId) => ({
    participantId,
    stats: stats.get(participantId)!,
  }));

  const tieSubsets = findTiedSubsets(
    ordered,
    input.completedFixtures,
    input.rankingConfiguration,
  );

  ordered = [...ordered].sort((a, b) => {
    const subset =
      tieSubsets.find((s) => s.includes(a.participantId) && s.includes(b.participantId)) ??
      [a.participantId, b.participantId];
    const keyA = sortKeyForParticipant(
      a.participantId,
      a.stats,
      subset,
      input.completedFixtures,
      input.rankingConfiguration,
    );
    const keyB = sortKeyForParticipant(
      b.participantId,
      b.stats,
      subset,
      input.completedFixtures,
      input.rankingConfiguration,
    );
    const cmp = compareKeysDesc(keyA, keyB);
    if (cmp !== 0) return cmp;
    return a.participantId.localeCompare(b.participantId);
  });

  const rows: GroupStandingRow[] = [];
  const perfectlyTied = new Set<string>();

  for (let i = 0; i < ordered.length; i++) {
    const row = ordered[i]!;
    const prev = i > 0 ? ordered[i - 1] : null;
    const position =
      prev &&
      compareKeysDesc(
        sortKeyForParticipant(
          prev.participantId,
          prev.stats,
          tieSubsets.find((s) => s.includes(prev.participantId)) ?? [prev.participantId],
          input.completedFixtures,
          input.rankingConfiguration,
        ),
        sortKeyForParticipant(
          row.participantId,
          row.stats,
          tieSubsets.find((s) => s.includes(row.participantId)) ?? [row.participantId],
          input.completedFixtures,
          input.rankingConfiguration,
        ),
      ) === 0
        ? rows[i - 1]!.position
        : i + 1;

    rows.push({
      participantId: row.participantId,
      position,
      played: row.stats.played,
      won: row.stats.won,
      drawn: row.stats.drawn,
      lost: row.stats.lost,
      goalsFor: row.stats.goalsFor,
      goalsAgainst: row.stats.goalsAgainst,
      goalDifference: row.stats.goalsFor - row.stats.goalsAgainst,
      points: row.stats.points,
      tiedAtPosition: false,
    });
  }

  for (const row of rows) {
    const samePosition = rows.filter((r) => r.position === row.position);
    if (samePosition.length > 1) {
      for (const r of samePosition) {
        perfectlyTied.add(r.participantId);
        r.tiedAtPosition = true;
      }
    }
  }

  return { rows, perfectlyTiedParticipantIds: perfectlyTied };
}

export function participantAtGroupRank(
  standings: GroupStandingsResult,
  rank: number,
): string | null {
  const atRank = standings.rows.filter((r) => r.position === rank);
  if (atRank.length !== 1) return null;
  const row = atRank[0]!;
  if (row.tiedAtPosition) return null;
  return row.participantId;
}
