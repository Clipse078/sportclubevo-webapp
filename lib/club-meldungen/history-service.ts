import type { ClubMeldungHistoryEventType, Prisma } from "@prisma/client";

export async function recordClubMeldungHistory(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    meldungId: string;
    eventType: ClubMeldungHistoryEventType;
    actorUserId?: string | null;
    payloadJson?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.clubMeldungHistoryEvent.create({
    data: {
      tenantId: input.tenantId,
      meldungId: input.meldungId,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      payloadJson: input.payloadJson ?? undefined,
    },
  });
}