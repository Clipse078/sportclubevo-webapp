import { prisma } from "@/lib/db/prisma";
import { currentTeamSeasonWhere } from "@/lib/teams/current-season";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export type TeamChatMentionCandidate = {
  personId: string;
  firstName: string;
  lastName: string;
  label: string;
};

/**
 * Team-scoped mention candidates from the active season roster (trainers + players).
 */
export async function listTeamChatMentionCandidates(input: {
  tenantId: string;
  teamId: string;
  query?: string;
  limit?: number;
}): Promise<TeamChatMentionCandidate[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const q = input.query?.trim().toLowerCase() ?? "";

  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
      ...currentTeamSeasonWhere(),
    },
    select: {
      playerSquadMembers: {
        select: {
          person: { select: { id: true, firstName: true, lastName: true, isActive: true } },
        },
      },
      trainerTeamMembers: {
        select: {
          person: { select: { id: true, firstName: true, lastName: true, isActive: true } },
        },
      },
    },
  });

  if (!teamSeason) return [];

  const byId = new Map<string, TeamChatMentionCandidate>();
  for (const row of [
    ...teamSeason.playerSquadMembers,
    ...teamSeason.trainerTeamMembers,
  ]) {
    const person = row.person;
    if (!person.isActive) continue;
    const label = `${person.firstName} ${person.lastName}`.trim();
    byId.set(person.id, {
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      label,
    });
  }

  let candidates = [...byId.values()];
  if (q) {
    candidates = candidates.filter((c) => c.label.toLowerCase().includes(q));
  }
  candidates.sort((a, b) => a.label.localeCompare(b.label, "de"));
  return candidates.slice(0, limit);
}

export async function assertTeamMentionPersonIdsAllowed(input: {
  tenantId: string;
  teamId: string;
  personIds: readonly string[];
}): Promise<void> {
  const unique = [...new Set(input.personIds.filter(Boolean))];
  if (unique.length === 0) return;

  const allowed = await listTeamChatMentionCandidates({
    tenantId: input.tenantId,
    teamId: input.teamId,
    limit: 500,
  });
  const allowedIds = new Set(allowed.map((c) => c.personId));
  for (const id of unique) {
    if (!allowedIds.has(id)) {
      throw new TeamCommunicationValidationError("mention person is outside team scope");
    }
  }
}
