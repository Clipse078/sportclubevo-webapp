import { prisma } from "@/lib/db/prisma";
import type { PersonalTeamRelationship } from "./types";
import { resolveSportingKindFromFunctionKey } from "./sporting-assignment";

export type AssignmentTeamSeasonScopeRow = {
  teamId: string | null;
  seasonId: string | null;
  functionKey: string;
};

/**
 * Resolves TeamSeason ids for active sporting PersonAssignment rows and merges
 * TRAINER/PLAYER kinds + teamSeasonIds onto existing team relationships.
 */
export async function mergeSportingAssignmentTeamSeasonScopes(input: {
  tenantId: string;
  assignmentRows: readonly AssignmentTeamSeasonScopeRow[];
  mergeTeamRelationship: (
    input: {
      teamId: string;
      teamName: string;
      kind: "TRAINER" | "PLAYER";
      functionKey?: string;
      teamSeasonId: string;
    },
  ) => void;
  teamNameByTeamId: ReadonlyMap<string, string>;
}): Promise<void> {
  const sportingRows = input.assignmentRows.filter(
    (row): row is AssignmentTeamSeasonScopeRow & { teamId: string } =>
      Boolean(row.teamId) && resolveSportingKindFromFunctionKey(row.functionKey) != null,
  );
  if (sportingRows.length === 0) {
    return;
  }

  const teamIds = [...new Set(sportingRows.map((row) => row.teamId))];
  const teamSeasonRows = await prisma.teamSeason.findMany({
    where: { teamId: { in: teamIds }, team: { tenantId: input.tenantId } },
    select: {
      id: true,
      teamId: true,
      seasonId: true,
      season: { select: { isActive: true } },
    },
  });

  for (const row of sportingRows) {
    const sportingKind = resolveSportingKindFromFunctionKey(row.functionKey);
    if (!sportingKind) continue;

    const scopedTeamSeasonIds =
      row.seasonId != null
        ? teamSeasonRows
            .filter((ts) => ts.teamId === row.teamId && ts.seasonId === row.seasonId)
            .map((ts) => ts.id)
        : teamSeasonRows
            .filter((ts) => ts.teamId === row.teamId && ts.season.isActive)
            .map((ts) => ts.id);

    const teamName = input.teamNameByTeamId.get(row.teamId) ?? "Team";
    for (const teamSeasonId of scopedTeamSeasonIds) {
      input.mergeTeamRelationship({
        teamId: row.teamId,
        teamName,
        kind: sportingKind,
        functionKey: row.functionKey,
        teamSeasonId,
      });
    }
  }
}

export function collectTeamSeasonIdsFromRelationships(
  teams: readonly PersonalTeamRelationship[],
): string[] {
  const ids = new Set<string>();
  for (const team of teams) {
    for (const teamSeasonId of team.teamSeasonIds) {
      ids.add(teamSeasonId);
    }
  }
  return [...ids];
}
