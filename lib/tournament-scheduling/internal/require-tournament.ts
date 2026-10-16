import { prisma } from "@/lib/db/prisma";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";

export async function requireTournamentEvent(tenantId: string, tournamentId: string): Promise<void> {
  const event = await prisma.event.findFirst({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { id: true },
  });
  if (!event) throw new TournamentNotFoundError(tournamentId);
}
