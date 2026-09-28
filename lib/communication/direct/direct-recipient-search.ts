import { prisma } from "@/lib/db/prisma";
import { resolveSenderCommunicationScope } from "@/lib/communication/platform/recipient-resolution/sender-communication-scope";
import { formatPersonDisplayName } from "@/lib/communication/inbox/inbox-display";

export type DirectMessageRecipientCandidate = {
  personId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  teamLabels: string[];
  orgUnitLabels: string[];
};

const SEARCH_LIMIT = 20;

export async function searchDirectMessageRecipients(input: {
  tenantId: string;
  senderUserId: string;
  query: string;
}): Promise<DirectMessageRecipientCandidate[]> {
  const q = input.query.trim();
  if (q.length < 2) return [];

  const { scope } = await resolveSenderCommunicationScope({
    tenantId: input.tenantId,
    senderUserId: input.senderUserId,
    context: { kind: "DIRECT", tenantId: input.tenantId },
  });

  const allowedIds = [...scope.allowedSubjectPersonIds];
  if (allowedIds.length === 0) return [];

  const persons = await prisma.person.findMany({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      id: { in: allowedIds },
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    take: SEARCH_LIMIT,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      trainerTeamMembers: {
        where: { status: "ACTIVE", teamSeason: { status: "ACTIVE" } },
        take: 3,
        select: { teamSeason: { select: { team: { select: { name: true } } } } },
      },
      orgUnitMemberships: {
        where: { status: "ACTIVE" },
        take: 3,
        select: { orgUnit: { select: { name: true } } },
      },
    },
  });

  return persons.map((person) => ({
    personId: person.id,
    userId: person.userId,
    displayName: formatPersonDisplayName(person),
    email: person.email,
    teamLabels: person.trainerTeamMembers
      .map((m) => m.teamSeason.team.name)
      .filter(Boolean),
    orgUnitLabels: person.orgUnitMemberships.map((m) => m.orgUnit.name).filter(Boolean),
  }));
}
