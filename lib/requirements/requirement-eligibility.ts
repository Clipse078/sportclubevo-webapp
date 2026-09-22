import type { Prisma } from "@prisma/client";

/** Canonical open ACK obligation on RequirementRecipient (PersonalAction + notifications base). */
export const openAcknowledgeableRequirementRecipientWhere: Prisma.RequirementRecipientWhereInput =
  {
    removedAt: null,
    resolutionStatus: "OPEN",
    requirement: {
      status: "ACTIVE",
      responseMode: "ACKNOWLEDGE",
    },
  };

export function openAcknowledgeableRequirementRecipientForPersons(
  subjectPersonIds: readonly string[],
): Prisma.RequirementRecipientWhereInput {
  return {
    ...openAcknowledgeableRequirementRecipientWhere,
    subjectPersonId: { in: [...subjectPersonIds] },
  };
}
