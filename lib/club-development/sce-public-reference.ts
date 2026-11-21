import type { Prisma, PrismaClient } from "@prisma/client";

const SCE_PUBLIC_REFERENCE_PREFIX = "SCE-";

/** Singleton row in `ScePublicNumberSequence`. */
export const SCE_PUBLIC_NUMBER_SEQUENCE_ID = "global";

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
 * Allocates the next global SCE sequence number inside an existing transaction.
 * Numbers are never reused or rewritten after allocation.
 *
 * Concurrency: row lock on `ScePublicNumberSequence` + primary key on `ScePublicNumberLedger`.
 */
export async function allocateScePublicNumber(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const seq = await tx.scePublicNumberSequence.upsert({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    create: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const number = seq.nextNumber === 2 ? 1 : seq.nextNumber - 1;
  await tx.scePublicNumberLedger.create({
    data: { scePublicNumber: number },
  });
  return number;
}

export async function ensureScePublicNumberLedgerEntry(
  tx: Prisma.TransactionClient,
  scePublicNumber: number,
): Promise<void> {
  await tx.scePublicNumberLedger.upsert({
    where: { scePublicNumber },
    create: { scePublicNumber },
    update: {},
  });
}

export async function findMaxAssignedScePublicNumber(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<number | null> {
  const [strategies, targets, tasks, meldungen] = await Promise.all([
    client.clubStrategy.aggregate({ _max: { scePublicNumber: true } }),
    client.target.aggregate({ _max: { scePublicNumber: true } }),
    client.task.aggregate({ _max: { scePublicNumber: true } }),
    client.clubMeldung.aggregate({ _max: { scePublicNumber: true } }),
  ]);
  const max = Math.max(
    strategies._max.scePublicNumber ?? 0,
    targets._max.scePublicNumber ?? 0,
    tasks._max.scePublicNumber ?? 0,
    meldungen._max.scePublicNumber ?? 0,
  );
  return max > 0 ? max : null;
}

export type ScePublicNumberCollision = {
  scePublicNumber: number;
  occurrences: number;
};

/**
 * Detects duplicate `scePublicNumber` values across the four SCE record tables.
 * Run before backfill; abort rollout when collisions are present.
 */
export async function findScePublicNumberCollisions(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<ScePublicNumberCollision[]> {
  const [strategies, targets, tasks, meldungen] = await Promise.all([
    client.clubStrategy.findMany({
      where: { scePublicNumber: { not: null } },
      select: { scePublicNumber: true },
    }),
    client.target.findMany({
      where: { scePublicNumber: { not: null } },
      select: { scePublicNumber: true },
    }),
    client.task.findMany({
      where: { scePublicNumber: { not: null } },
      select: { scePublicNumber: true },
    }),
    client.clubMeldung.findMany({
      where: { scePublicNumber: { not: null } },
      select: { scePublicNumber: true },
    }),
  ]);

  const counts = new Map<number, number>();
  for (const row of [...strategies, ...targets, ...tasks, ...meldungen]) {
    if (row.scePublicNumber == null) continue;
    counts.set(row.scePublicNumber, (counts.get(row.scePublicNumber) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([scePublicNumber, occurrences]) => ({ scePublicNumber, occurrences }))
    .sort((a, b) => a.scePublicNumber - b.scePublicNumber);
}

export async function syncScePublicNumberSequenceFromAssignments(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<number | null> {
  const max = await findMaxAssignedScePublicNumber(client);
  if (max == null) return null;
  const floor = max + 1;
  const existing = await client.scePublicNumberSequence.findUnique({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    select: { nextNumber: true },
  });
  const nextNumber = Math.max(floor, existing?.nextNumber ?? floor);
  await client.scePublicNumberSequence.upsert({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    create: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID, nextNumber },
    update: {
      nextNumber: { set: nextNumber },
    },
  });
  return nextNumber;
}