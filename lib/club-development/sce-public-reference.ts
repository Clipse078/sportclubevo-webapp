import type { Prisma, PrismaClient } from "@prisma/client";

const SCE_PUBLIC_REFERENCE_PREFIX = "SCE-";

/** Singleton row in `ScePublicNumberSequence`. */
export const SCE_PUBLIC_NUMBER_SEQUENCE_ID = "global";

/** Minimum digit width for formatted references (PO: at least six digits). */
export const SCE_PUBLIC_REFERENCE_MIN_DIGITS = 6;

/** PostgreSQL BIGINT upper bound for positive issuance (signed 63-bit payload). */
export const SCE_PUBLIC_SEQUENCE_MAX = BigInt("9223372036854775807");

const SCE_SEQUENCE_ONE = BigInt(1);
const SCE_SEQUENCE_TWO = BigInt(2);

const SCE_PUBLIC_REFERENCE_PATTERN = /^SCE-(\d+)$/i;

export type ScePublicSequenceNumber = bigint;

export function coerceScePublicSequenceNumber(
  value: bigint | number | null | undefined,
): ScePublicSequenceNumber | null {
  if (value == null) return null;
  const n = typeof value === "bigint" ? value : BigInt(value);
  if (n < SCE_SEQUENCE_ONE || n > SCE_PUBLIC_SEQUENCE_MAX) return null;
  return n;
}

export function formatScePublicReference(
  sequenceNumber: bigint | number,
): string {
  const n = coerceScePublicSequenceNumber(sequenceNumber);
  if (n == null) {
    throw new Error("SCE_PUBLIC_REFERENCE_SEQUENCE_INVALID");
  }
  return `${SCE_PUBLIC_REFERENCE_PREFIX}${n.toString().padStart(
    SCE_PUBLIC_REFERENCE_MIN_DIGITS,
    "0",
  )}`;
}

export function parseScePublicReference(
  input: string,
): { sequenceNumber: ScePublicSequenceNumber } | null {
  const trimmed = input.trim();
  const match = SCE_PUBLIC_REFERENCE_PATTERN.exec(trimmed);
  if (!match) return null;
  const digits = match[1]!;
  if (!/^\d+$/.test(digits) || digits.length > 19) return null;
  if (digits.length === 19 && digits > SCE_PUBLIC_SEQUENCE_MAX.toString()) {
    return null;
  }
  let sequenceNumber: bigint;
  try {
    sequenceNumber = BigInt(digits);
  } catch {
    return null;
  }
  if (sequenceNumber < SCE_SEQUENCE_ONE) return null;
  if (sequenceNumber > SCE_PUBLIC_SEQUENCE_MAX) return null;
  return { sequenceNumber };
}

export function scePublicReferenceFromNumber(
  scePublicNumber: bigint | number | null | undefined,
): string | null {
  const n = coerceScePublicSequenceNumber(scePublicNumber);
  if (n == null) return null;
  return formatScePublicReference(n);
}

/**
 * Allocates the next global SCE sequence number inside an existing transaction.
 * Numbers are never reused or rewritten after allocation.
 *
 * Concurrency: row lock on `ScePublicNumberSequence` + primary key on `ScePublicNumberLedger`.
 */
export async function allocateScePublicNumber(
  tx: Prisma.TransactionClient,
): Promise<ScePublicSequenceNumber> {
  const seq = await tx.scePublicNumberSequence.upsert({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    create: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID, nextNumber: SCE_SEQUENCE_TWO },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  const number =
    seq.nextNumber === SCE_SEQUENCE_TWO
      ? SCE_SEQUENCE_ONE
      : seq.nextNumber - SCE_SEQUENCE_ONE;
  await tx.scePublicNumberLedger.create({
    data: { scePublicNumber: number },
  });
  return number;
}

export async function ensureScePublicNumberLedgerEntry(
  tx: Prisma.TransactionClient,
  scePublicNumber: ScePublicSequenceNumber,
): Promise<void> {
  await tx.scePublicNumberLedger.upsert({
    where: { scePublicNumber },
    create: { scePublicNumber },
    update: {},
  });
}

function maxBigInt(values: readonly (bigint | null | undefined)[]): bigint | null {
  let max: bigint | null = null;
  for (const v of values) {
    if (v == null || v < SCE_SEQUENCE_ONE) continue;
    if (max == null || v > max) max = v;
  }
  return max;
}

export async function findMaxAssignedScePublicNumber(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<ScePublicSequenceNumber | null> {
  const [strategies, targets, tasks, meldungen] = await Promise.all([
    client.clubStrategy.aggregate({ _max: { scePublicNumber: true } }),
    client.target.aggregate({ _max: { scePublicNumber: true } }),
    client.task.aggregate({ _max: { scePublicNumber: true } }),
    client.clubMeldung.aggregate({ _max: { scePublicNumber: true } }),
  ]);
  return maxBigInt([
    strategies._max.scePublicNumber,
    targets._max.scePublicNumber,
    tasks._max.scePublicNumber,
    meldungen._max.scePublicNumber,
  ]);
}

export type ScePublicNumberCollision = {
  scePublicNumber: ScePublicSequenceNumber;
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

  const counts = new Map<string, { n: ScePublicSequenceNumber; count: number }>();
  for (const row of [...strategies, ...targets, ...tasks, ...meldungen]) {
    if (row.scePublicNumber == null) continue;
    const key = row.scePublicNumber.toString();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { n: row.scePublicNumber, count: 1 });
    }
  }

  return [...counts.values()]
    .filter(({ count }) => count > 1)
    .map(({ n, count }) => ({ scePublicNumber: n, occurrences: count }))
    .sort((a, b) => (a.scePublicNumber < b.scePublicNumber ? -1 : a.scePublicNumber > b.scePublicNumber ? 1 : 0));
}

export async function syncScePublicNumberSequenceFromAssignments(
  client: PrismaClient | Prisma.TransactionClient,
): Promise<ScePublicSequenceNumber | null> {
  const max = await findMaxAssignedScePublicNumber(client);
  if (max == null) return null;
  const floor = max + SCE_SEQUENCE_ONE;
  const existing = await client.scePublicNumberSequence.findUnique({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    select: { nextNumber: true },
  });
  const nextNumber =
    existing?.nextNumber != null && existing.nextNumber > floor
      ? existing.nextNumber
      : floor;
  await client.scePublicNumberSequence.upsert({
    where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
    create: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID, nextNumber },
    update: {
      nextNumber: { set: nextNumber },
    },
  });
  return nextNumber;
}