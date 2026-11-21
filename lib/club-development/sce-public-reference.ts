import type { Prisma } from "@prisma/client";

const SCE_PUBLIC_REFERENCE_PREFIX = "SCE-";

/** Minimum digit width for formatted references (PO: at least six digits). */
export const SCE_PUBLIC_REFERENCE_MIN_DIGITS = 6;

const SCE_PUBLIC_REFERENCE_PATTERN = /^SCE-(\d+)$/i;

export function formatScePublicReference(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error("SCE_PUBLIC_REFERENCE_SEQUENCE_INVALID");
  }
  return `${SCE_PUBLIC_REFERENCE_PREFIX}${String(sequenceNumber).padStart(
    SCE_PUBLIC_REFERENCE_MIN_DIGITS,
    "0",
  )}`;
}

export function parseScePublicReference(
  input: string,
): { sequenceNumber: number } | null {
  const trimmed = input.trim();
  const match = SCE_PUBLIC_REFERENCE_PATTERN.exec(trimmed);
  if (!match) return null;
  const sequenceNumber = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(sequenceNumber) || sequenceNumber < 1) return null;
  return { sequenceNumber };
}

export function scePublicReferenceFromNumber(
  scePublicNumber: number | null | undefined,
): string | null {
  if (scePublicNumber == null || scePublicNumber < 1) return null;
  return formatScePublicReference(scePublicNumber);
}

/**
 * Allocates the next tenant-wide SCE sequence number inside an existing transaction.
 * Numbers are never reused or rewritten after allocation.
 */
export async function allocateScePublicNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<number> {
  const seq = await tx.tenantScePublicNumberSequence.upsert({
    where: { tenantId },
    create: { tenantId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  return seq.nextNumber === 2 ? 1 : seq.nextNumber - 1;
}