import type { Prisma, PrismaClient } from "@prisma/client";
import {
  allocateScePublicNumber,
  findMaxAssignedScePublicNumber,
  findScePublicNumberCollisions,
  formatScePublicReference,
  SCE_PUBLIC_NUMBER_SEQUENCE_ID,
  syncScePublicNumberSequenceFromAssignments,
} from "@/lib/club-development/sce-public-reference";

export type ScePublicReferenceBackfillRow = {
  kind: "strategy" | "target" | "task" | "meldung";
  id: string;
  tenantId: string;
  createdAt: Date;
};

export async function loadScePublicReferenceBackfillRows(
  prisma: PrismaClient,
  tenantFilter: string | null,
): Promise<ScePublicReferenceBackfillRow[]> {
  const [strategies, targets, tasks, meldungen] = await Promise.all([
    prisma.clubStrategy.findMany({
      where: {
        scePublicNumber: null,
        ...(tenantFilter ? { tenantId: tenantFilter } : {}),
      },
      select: { id: true, tenantId: true, createdAt: true },
    }),
    prisma.target.findMany({
      where: {
        scePublicNumber: null,
        ...(tenantFilter ? { tenantId: tenantFilter } : {}),
      },
      select: { id: true, tenantId: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: {
        scePublicNumber: null,
        ...(tenantFilter ? { tenantId: tenantFilter } : {}),
      },
      select: { id: true, tenantId: true, createdAt: true },
    }),
    prisma.clubMeldung.findMany({
      where: {
        scePublicNumber: null,
        ...(tenantFilter ? { tenantId: tenantFilter } : {}),
      },
      select: { id: true, tenantId: true, createdAt: true },
    }),
  ]);

  return [
    ...strategies.map((r) => ({ kind: "strategy" as const, ...r })),
    ...targets.map((r) => ({ kind: "target" as const, ...r })),
    ...tasks.map((r) => ({ kind: "task" as const, ...r })),
    ...meldungen.map((r) => ({ kind: "meldung" as const, ...r })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

async function applyScePublicNumber(
  tx: Prisma.TransactionClient,
  row: ScePublicReferenceBackfillRow,
  number: number,
): Promise<void> {
  if (row.kind === "strategy") {
    await tx.clubStrategy.update({ where: { id: row.id }, data: { scePublicNumber: number } });
  } else if (row.kind === "target") {
    await tx.target.update({ where: { id: row.id }, data: { scePublicNumber: number } });
  } else if (row.kind === "task") {
    await tx.task.update({ where: { id: row.id }, data: { scePublicNumber: number } });
  } else {
    await tx.clubMeldung.update({ where: { id: row.id }, data: { scePublicNumber: number } });
  }
}

export type ScePublicReferenceBackfillResult = {
  assigned: number;
  tenantCount: number;
  collisions: Awaited<ReturnType<typeof findScePublicNumberCollisions>>;
};

export async function runScePublicReferenceBackfill(
  prisma: PrismaClient,
  options: { tenantFilter?: string | null; dryRun?: boolean } = {},
): Promise<ScePublicReferenceBackfillResult> {
  const tenantFilter = options.tenantFilter?.trim() || null;
  const dryRun = Boolean(options.dryRun);

  const collisions = await findScePublicNumberCollisions(prisma);
  if (collisions.length > 0) {
    return { assigned: 0, tenantCount: 0, collisions };
  }

  const rows = await loadScePublicReferenceBackfillRows(prisma, tenantFilter);
  const tenantIds = new Set(rows.map((r) => r.tenantId));

  if (dryRun) {
    const maxAssigned = (await findMaxAssignedScePublicNumber(prisma)) ?? 0;
    const seq = await prisma.scePublicNumberSequence.findUnique({
      where: { id: SCE_PUBLIC_NUMBER_SEQUENCE_ID },
      select: { nextNumber: true },
    });
    let cursorPreview = Math.max(maxAssigned + 1, seq?.nextNumber ?? 1);
    for (const row of rows) {
      const number = cursorPreview++;
      console.log(
        `[dry-run] ${row.kind} ${row.id} (tenant ${row.tenantId}) -> ${formatScePublicReference(number)}`,
      );
    }
    return { assigned: rows.length, tenantCount: tenantIds.size, collisions: [] };
  }

  let assigned = 0;
  for (const row of rows) {
    await prisma.$transaction(async (tx) => {
      const number = await allocateScePublicNumber(tx);
      await applyScePublicNumber(tx, row, number);
    });
    assigned += 1;
  }

  await syncScePublicNumberSequenceFromAssignments(prisma);

  return { assigned, tenantCount: tenantIds.size, collisions: [] };
}