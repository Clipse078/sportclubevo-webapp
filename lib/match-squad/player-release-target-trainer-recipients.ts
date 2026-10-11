/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R1 — expand target TeamSeason to trainer user accounts.
 */

import { prisma } from "@/lib/db/prisma";

export type TargetTrainerRecipientResolution = {
  recipientUserIds: string[];
  activeTrainerCount: number;
  trainersWithoutUserAccount: number;
};

export async function resolveTargetTeamTrainerRecipientUserIds(input: {
  tenantId: string;
  targetTeamSeasonId: string;
  excludeUserIds?: readonly string[];
}): Promise<TargetTrainerRecipientResolution> {
  const trainers = await prisma.trainerTeamMember.findMany({
    where: {
      teamSeasonId: input.targetTeamSeasonId,
      status: "ACTIVE",
      teamSeason: { team: { tenantId: input.tenantId } },
    },
    select: {
      person: {
        select: { userId: true },
      },
    },
  });

  const excluded = new Set((input.excludeUserIds ?? []).filter(Boolean));
  const userIds = new Set<string>();
  let withoutAccount = 0;

  for (const row of trainers) {
    const userId = row.person.userId?.trim();
    if (!userId) {
      withoutAccount += 1;
      continue;
    }
    if (excluded.has(userId)) continue;
    userIds.add(userId);
  }

  return {
    recipientUserIds: [...userIds],
    activeTrainerCount: trainers.length,
    trainersWithoutUserAccount: withoutAccount,
  };
}
