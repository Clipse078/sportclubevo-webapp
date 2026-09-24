import { prisma } from "@/lib/db/prisma";
import { getParticipationStatusLabel } from "@/lib/participation/labels";
import { resolveClubEventInviteePersonIds } from "@/lib/events/club-event-participation-audience-service";
import type { PlanningParticipantsPresentation } from "@/lib/planning/planning-participant-types";

function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  return input.displayName?.trim() || `${input.firstName} ${input.lastName}`.trim();
}

export async function loadClubEventPlanningParticipants(
  tenantId: string,
  eventId: string,
): Promise<PlanningParticipantsPresentation> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: { id: true },
  });
  if (!event) {
    return { people: [], emptyStateKey: "notFound" };
  }

  const personIds = await resolveClubEventInviteePersonIds(tenantId, eventId);
  if (personIds.length === 0) {
    return { people: [], emptyStateKey: "noAudience" };
  }

  const [people, responses] = await Promise.all([
    prisma.person.findMany({
      where: { tenantId, id: { in: personIds }, isActive: true },
      select: { id: true, firstName: true, lastName: true, displayName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.participationResponse.findMany({
      where: {
        tenantId,
        eventId,
        eventKind: "CLUB_EVENT",
        personId: { in: personIds },
      },
      select: { personId: true, status: true },
    }),
  ]);

  const responseByPerson = new Map(responses.map((row) => [row.personId, row.status]));

  return {
    people: people.map((person) => {
      const status = responseByPerson.get(person.id) ?? "OPEN";
      return {
        id: person.id,
        displayName: formatPersonName(person),
        role: "INVITEE",
        roleLabel: "Eingeladen",
        participationStatus: status,
        participationStatusLabel: getParticipationStatusLabel(status),
      };
    }),
  };
}

export async function ensureClubEventParticipationResponses(
  tenantId: string,
  eventId: string,
): Promise<void> {
  const personIds = await resolveClubEventInviteePersonIds(tenantId, eventId);
  if (personIds.length === 0) return;

  const existing = await prisma.participationResponse.findMany({
    where: { tenantId, eventId, eventKind: "CLUB_EVENT" },
    select: { personId: true },
  });
  const existingSet = new Set(existing.map((row) => row.personId));
  const missing = personIds.filter((id) => !existingSet.has(id));
  if (missing.length === 0) return;

  await prisma.participationResponse.createMany({
    data: missing.map((personId) => ({
      tenantId,
      personId,
      eventKind: "CLUB_EVENT" as const,
      eventId,
      teamSeasonId: null,
      status: "OPEN" as const,
    })),
    skipDuplicates: true,
  });
}
