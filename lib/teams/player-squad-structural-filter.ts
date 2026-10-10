import type { PlayerSquadStatus, Prisma } from "@prisma/client";

/**
 * Canonical structural season Kader membership for participation audience and Match Squad candidates.
 * INACTIVE / ARCHIVED rows are historical — not current roster population.
 */
export const STRUCTURAL_PLAYER_SQUAD_STATUS: PlayerSquadStatus = "ACTIVE";

export function structuralPlayerSquadMemberWhere(
  teamSeasonId: string,
): Prisma.PlayerSquadMemberWhereInput {
  return {
    teamSeasonId,
    status: STRUCTURAL_PLAYER_SQUAD_STATUS,
  };
}
