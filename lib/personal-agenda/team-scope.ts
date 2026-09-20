import { prisma } from "@/lib/db/prisma";

export async function resolvePersonalTeamIds(args: {
  tenantId: string;
  userId: string | null | undefined;
}): Promise<{ teamIds: string[]; hasLinkedPerson: boolean }> {
  if (!args.userId) {
    return { teamIds: [], hasLinkedPerson: false };
  }

  const person = await prisma.person.findFirst({
    where: { tenantId: args.tenantId, userId: args.userId },
    select: { id: true },
  });

  if (!person) {
    return { teamIds: [], hasLinkedPerson: false };
  }

  const [trainerRows, squadRows] = await Promise.all([
    prisma.trainerTeamMember.findMany({
      where: {
        personId: person.id,
        status: "ACTIVE",
        teamSeason: { team: { tenantId: args.tenantId } },
      },
      select: { teamSeason: { select: { teamId: true } } },
    }),
    prisma.playerSquadMember.findMany({
      where: {
        personId: person.id,
        status: "ACTIVE",
        teamSeason: { team: { tenantId: args.tenantId } },
      },
      select: { teamSeason: { select: { teamId: true } } },
    }),
  ]);

  const teamIds = [
    ...new Set(
      [
        ...trainerRows.map((row) => row.teamSeason.teamId),
        ...squadRows.map((row) => row.teamSeason.teamId),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  return { teamIds, hasLinkedPerson: true };
}
