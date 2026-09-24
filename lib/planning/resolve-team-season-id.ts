import { prisma } from "@/lib/db/prisma";

export async function resolveTeamSeasonIdForTeamAndSeason(
  tenantId: string,
  teamId: string | null | undefined,
  seasonId: string | null | undefined,
): Promise<string | null> {
  const tid = teamId?.trim();
  const sid = seasonId?.trim();
  if (!tid || !sid) return null;

  const row = await prisma.teamSeason.findFirst({
    where: {
      teamId: tid,
      seasonId: sid,
      team: { tenantId },
    },
    select: { id: true },
  });

  return row?.id ?? null;
}
