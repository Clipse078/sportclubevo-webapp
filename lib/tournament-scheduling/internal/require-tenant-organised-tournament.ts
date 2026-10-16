import { prisma } from "@/lib/db/prisma";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { canTenantPlanTournament } from "../planner-eligibility";
import { TournamentPlannerNotOwnedByTenantError } from "../errors";

export async function requireTenantOrganisedTournament(
  tenantId: string,
  tournamentId: string,
): Promise<{ id: string }> {
  const [event, tenant] = await Promise.all([
    prisma.event.findFirst({
      where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
      select: { id: true, homeAway: true, organizerName: true },
    }),
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { name: true },
    }),
  ]);
  if (!event) {
    throw new TournamentNotFoundError(tournamentId);
  }
  if (
    !canTenantPlanTournament({
      homeAway: event.homeAway,
      organizerName: event.organizerName,
      tenantName: tenant?.name ?? null,
    })
  ) {
    throw new TournamentPlannerNotOwnedByTenantError(tournamentId);
  }
  return { id: event.id };
}
