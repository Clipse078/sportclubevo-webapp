import { prisma } from "@/lib/db/prisma";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import {
  canTenantPlanTournament,
  normalizeTournamentOrganiserHomeAway,
} from "../planner-eligibility";
import { TournamentPlannerNotOwnedByTenantError } from "../errors";

export async function requireTenantOrganisedTournament(
  tenantId: string,
  tournamentId: string,
): Promise<{ id: string; homeAway: "HOME" | "AWAY" }> {
  const event = await prisma.event.findFirst({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { id: true, homeAway: true },
  });
  if (!event) {
    throw new TournamentNotFoundError(tournamentId);
  }
  const homeAway = normalizeTournamentOrganiserHomeAway(event.homeAway);
  if (!canTenantPlanTournament({ homeAway })) {
    throw new TournamentPlannerNotOwnedByTenantError(tournamentId);
  }
  return { id: event.id, homeAway };
}
