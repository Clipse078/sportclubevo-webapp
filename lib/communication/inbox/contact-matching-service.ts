import {
  CommunicationCenterContactMatchStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeEmailAddress } from "@/lib/communication/inbox/message-id";

export type ContactMatchResult = {
  status: CommunicationCenterContactMatchStatus;
  matchedPersonId: string | null;
  matchedSponsorContactId: string | null;
};

export async function matchInboundSenderContact(
  tenantId: string,
  fromAddress: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<ContactMatchResult> {
  const email = normalizeEmailAddress(fromAddress);
  if (!email) {
    return {
      status: CommunicationCenterContactMatchStatus.UNMATCHED,
      matchedPersonId: null,
      matchedSponsorContactId: null,
    };
  }

  const persons = await tx.person.findMany({
    where: { tenantId, email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true },
    take: 3,
  });

  const sponsorContacts = await tx.sponsorContact.findMany({
    where: { tenantId, email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true },
    take: 3,
  });

  const uniqueMatches = persons.length + sponsorContacts.length;
  if (uniqueMatches === 0) {
    return {
      status: CommunicationCenterContactMatchStatus.UNMATCHED,
      matchedPersonId: null,
      matchedSponsorContactId: null,
    };
  }
  if (persons.length === 1 && sponsorContacts.length === 0) {
    return {
      status: CommunicationCenterContactMatchStatus.MATCHED,
      matchedPersonId: persons[0].id,
      matchedSponsorContactId: null,
    };
  }
  if (sponsorContacts.length === 1 && persons.length === 0) {
    return {
      status: CommunicationCenterContactMatchStatus.MATCHED,
      matchedPersonId: null,
      matchedSponsorContactId: sponsorContacts[0].id,
    };
  }

  return {
    status: CommunicationCenterContactMatchStatus.AMBIGUOUS,
    matchedPersonId: null,
    matchedSponsorContactId: null,
  };
}
