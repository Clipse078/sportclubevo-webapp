/**
 * Backfill tenant-wide SCE public numbers for existing Strategie, Ziel, Aufgabe, and Anliegen rows.
 * Run only against disposable / guarded databases — not shared STAGE without explicit approval.
 *
 * Usage: npx tsx scripts/sce-public-reference-backfill.ts [--tenant <id>] [--dry-run]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type BackfillRow = {
  kind: "strategy" | "target" | "task" | "meldung";
  id: string;
  tenantId: string;
  createdAt: Date;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tenantArgIdx = process.argv.indexOf("--tenant");
  const tenantFilter = tenantArgIdx >= 0 ? process.argv[tenantArgIdx + 1]?.trim() : null;

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

  const rows: BackfillRow[] = [
    ...strategies.map((r) => ({ kind: "strategy" as const, ...r })),
    ...targets.map((r) => ({ kind: "target" as const, ...r })),
    ...tasks.map((r) => ({ kind: "task" as const, ...r })),
    ...meldungen.map((r) => ({ kind: "meldung" as const, ...r })),
  ];

  const byTenant = new Map<string, BackfillRow[]>();
  for (const row of rows) {
    const list = byTenant.get(row.tenantId) ?? [];
    list.push(row);
    byTenant.set(row.tenantId, list);
  }

  let assigned = 0;
  for (const [tenantId, tenantRows] of byTenant) {
    tenantRows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    await prisma.$transaction(async (tx) => {
      const seq = await tx.tenantScePublicNumberSequence.upsert({
        where: { tenantId },
        create: { tenantId, nextNumber: 1 },
        update: {},
        select: { nextNumber: true },
      });
      let cursor = seq.nextNumber;
      for (const row of tenantRows) {
        const number = cursor++;
        if (dryRun) {
          console.log(`[dry-run] ${row.kind} ${row.id} -> SCE-${String(number).padStart(6, "0")}`);
        } else {
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
        assigned += 1;
      }
      if (!dryRun) {
        await tx.tenantScePublicNumberSequence.update({
          where: { tenantId },
          data: { nextNumber: cursor },
        });
      }
    });
  }

  console.log(
    dryRun
      ? `Dry run complete — ${assigned} rows would receive SCE numbers across ${byTenant.size} tenant(s).`
      : `Backfill complete — assigned ${assigned} SCE numbers across ${byTenant.size} tenant(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });