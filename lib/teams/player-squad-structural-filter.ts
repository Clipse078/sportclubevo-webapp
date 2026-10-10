import type { PlayerSquadStatus, Prisma } from "@prisma/client";

/**
 * Current season Kader membership (structural roster).
 * INACTIVE / ARCHIVED are historical — not current roster population.
 * INJURED / ABSENT remain on the Kader with operational sporting status.
 */
export const CURRENT_ROSTER_PLAYER_STATUSES = [
  "ACTIVE",
  "INJURED",
  "ABSENT",
] as const satisfies readonly PlayerSquadStatus[];

export function currentSeasonRosterPlayerSquadMemberWhere(
  teamSeasonId: string,
): Prisma.PlayerSquadMemberWhereInput {
  return {
    teamSeasonId,
    status: { in: [...CURRENT_ROSTER_PLAYER_STATUSES] },
  };
}

/** @deprecated Use currentSeasonRosterPlayerSquadMemberWhere — kept for import stability during R1. */
export const STRUCTURAL_PLAYER_SQUAD_STATUS: PlayerSquadStatus = "ACTIVE";

/** @deprecated Use currentSeasonRosterPlayerSquadMemberWhere. */
export function structuralPlayerSquadMemberWhere(
  teamSeasonId: string,
): Prisma.PlayerSquadMemberWhereInput {
  return currentSeasonRosterPlayerSquadMemberWhere(teamSeasonId);
}
