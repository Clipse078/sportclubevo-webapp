import type { Prisma } from "@prisma/client";

export async function allocateClubMeldungCaseNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<string> {
  const year = new Date().getUTCFullYear();
  const seq = await tx.clubMeldungNumberSequence.upsert({
    where: { tenantId },
    create: { tenantId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const assigned = seq.nextNumber === 2 ? 1 : seq.nextNumber - 1;
  return `M-${year}-${String(assigned).padStart(5, "0")}`;
}