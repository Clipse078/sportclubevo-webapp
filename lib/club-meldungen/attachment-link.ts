import type { Prisma } from "@prisma/client";

export type ValidateMeldungAttachmentLinkInput = {
  tenantId: string;
  uploaderUserId: string;
  communicationAttachmentId: string;
  targetMeldungId?: string;
};

/**
 * Validates a CommunicationAttachment may be linked to a ClubMeldung case.
 * Called inside create transaction before ClubMeldungAttachment insert.
 */
export async function assertAttachmentLinkableForMeldung(
  tx: Prisma.TransactionClient,
  input: ValidateMeldungAttachmentLinkInput,
): Promise<void> {
  const attachment = await tx.communicationAttachment.findFirst({
    where: {
      id: input.communicationAttachmentId,
      tenantId: input.tenantId,
      createdByUserId: input.uploaderUserId,
      lifecycleStatus: { in: ["STAGED", "READY"] },
    },
    select: { id: true },
  });
  if (!attachment) {
    throw new Error("ATTACHMENT_NOT_OWNED_OR_NOT_READY");
  }

  const existingLink = await tx.clubMeldungAttachment.findUnique({
    where: { communicationAttachmentId: input.communicationAttachmentId },
    select: { meldungId: true },
  });
  if (existingLink) {
    if (input.targetMeldungId && existingLink.meldungId === input.targetMeldungId) {
      return;
    }
    throw new Error("ATTACHMENT_ALREADY_LINKED");
  }
}