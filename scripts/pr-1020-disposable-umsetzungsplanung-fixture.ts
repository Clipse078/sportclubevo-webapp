/**
 * PR #1020 — disposable Umsetzungsplanung PO fixture (local TEST_DATABASE_URL only).
 *
 * Inventory: 1× Laufend, 2× Geplant (ranked), 1× Ungeplant task with SCE reference.
 */
import "dotenv/config";
import {
  DevelopmentSprintStatus,
  PrismaClient,
  TargetCategory,
  TargetPeriod,
  TargetStatus,
  TaskContextType,
  TaskStatus,
  TaskVisibilityScope,
  VisibilityScope,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { assertSafeTestDatabase } from "@/lib/test/safe-test-database";

export const PR_1020_DISPOSABLE_ORG_UNIT_ID = "pr-1020-junioren-org" as const;
export const PR_1020_DISPOSABLE_TASK_ID = "pr-1020-ungeplant-task" as const;
export const PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER = BigInt("202611210102042");
export const PR_1020_DISPOSABLE_PHASE_IDS = {
  active: "pr-1020-phase-laufend",
  plannedA: "pr-1020-phase-geplant-alpha",
  plannedB: "pr-1020-phase-geplant-beta",
} as const;

const PREFIX = "pr-1020-";

async function main(): Promise<void> {
  const url = assertSafeTestDatabase();
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, key: true } });
  if (!tenant) {
    throw new Error("Seed catalog missing tenant; run db:seed on disposable DB first.");
  }

  const user =
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } })) ??
    (await prisma.user.create({
      data: {
        id: `${PREFIX}actor`,
        email: "pr-1020-fixture@example.invalid",
        passwordHash: "disposable-fixture",
        firstName: "PO",
        lastName: "Fixture",
        tenantId: tenant.id,
      },
      select: { id: true },
    }));

  await prisma.orgUnit.upsert({
    where: { id: PR_1020_DISPOSABLE_ORG_UNIT_ID },
    update: { name: "Junioren (PO #1020)", key: "junioren-pr-1020" },
    create: {
      id: PR_1020_DISPOSABLE_ORG_UNIT_ID,
      tenantId: tenant.id,
      name: "Junioren (PO #1020)",
      key: "junioren-pr-1020",
      type: "DEPARTMENT",
      level: 1,
    },
  });

  const target = await prisma.target.upsert({
    where: { id: `${PREFIX}target` },
    update: { title: "PO #1020 Umsetzungsplanung Ziel" },
    create: {
      id: `${PREFIX}target`,
      tenantId: tenant.id,
      title: "PO #1020 Umsetzungsplanung Ziel",
      status: TargetStatus.ACTIVE,
      category: TargetCategory.GOVERNANCE,
      period: TargetPeriod.YEAR,
      createdByUserId: user.id,
      visibilityScope: VisibilityScope.ORGANISATION,
    },
    select: { id: true },
  });

  const now = Date.now();
  const activeStart = new Date(now - 7 * 86_400_000);
  const activeEnd = new Date(now + 14 * 86_400_000);
  const plannedStart = new Date(now + 21 * 86_400_000);

  await prisma.developmentSprint.upsert({
    where: { id: PR_1020_DISPOSABLE_PHASE_IDS.active },
    update: {
      title: "PO #1020 Laufend — Umsetzung Q4",
      status: DevelopmentSprintStatus.ACTIVE,
      startsAt: activeStart,
      endsAt: activeEnd,
      startedAt: activeStart,
    },
    create: {
      id: PR_1020_DISPOSABLE_PHASE_IDS.active,
      tenantId: tenant.id,
      slug: "po-1020-laufend",
      title: "PO #1020 Laufend — Umsetzung Q4",
      status: DevelopmentSprintStatus.ACTIVE,
      startsAt: activeStart,
      endsAt: activeEnd,
      startedAt: activeStart,
      visibilityScope: VisibilityScope.ORGANISATION,
      createdByUserId: user.id,
    },
  });

  const plannedPhases = [
    { id: PR_1020_DISPOSABLE_PHASE_IDS.plannedA, slug: "po-1020-geplant-alpha", title: "PO #1020 Geplant Alpha", rank: 10 },
    { id: PR_1020_DISPOSABLE_PHASE_IDS.plannedB, slug: "po-1020-geplant-beta", title: "PO #1020 Geplant Beta", rank: 20 },
  ] as const;

  for (const phase of plannedPhases) {
    const ends = new Date(plannedStart);
    ends.setUTCDate(ends.getUTCDate() + 28);
    await prisma.developmentSprint.upsert({
      where: { id: phase.id },
      update: {
        title: phase.title,
        status: DevelopmentSprintStatus.PLANNED,
        startsAt: plannedStart,
        endsAt: ends,
      },
      create: {
        id: phase.id,
        tenantId: tenant.id,
        slug: phase.slug,
        title: phase.title,
        status: DevelopmentSprintStatus.PLANNED,
        startsAt: plannedStart,
        endsAt: ends,
        visibilityScope: VisibilityScope.ORGANISATION,
        createdByUserId: user.id,
      },
    });
    await prisma.developmentPlannedSprintRank.upsert({
      where: { sprintId: phase.id },
      update: { rank: phase.rank },
      create: { tenantId: tenant.id, sprintId: phase.id, rank: phase.rank },
    });
  }

  await prisma.task.upsert({
    where: { id: PR_1020_DISPOSABLE_TASK_ID },
    update: {
      title: "PO #1020 Ungeplant — SCE Referenz",
      scePublicNumber: PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER,
    },
    create: {
      id: PR_1020_DISPOSABLE_TASK_ID,
      tenantId: tenant.id,
      scePublicNumber: PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER,
      title: "PO #1020 Ungeplant — SCE Referenz",
      status: TaskStatus.OPEN,
      contextType: TaskContextType.TARGET,
      contextId: target.id,
      orgUnitId: PR_1020_DISPOSABLE_ORG_UNIT_ID,
      createdByUserId: user.id,
      visibilityScope: TaskVisibilityScope.ORG_UNIT,
    },
  });

  await prisma.developmentUnplannedTaskRank.upsert({
    where: { taskId: PR_1020_DISPOSABLE_TASK_ID },
    update: { rank: 10 },
    create: { tenantId: tenant.id, taskId: PR_1020_DISPOSABLE_TASK_ID, rank: 10 },
  });

  console.log(
    JSON.stringify(
      {
        pullRequest: 1020,
        writePerformed: true,
        tenantKey: tenant.key,
        orgUnitId: PR_1020_DISPOSABLE_ORG_UNIT_ID,
        unplannedTaskId: PR_1020_DISPOSABLE_TASK_ID,
        scePublicNumber: PR_1020_DISPOSABLE_SCE_PUBLIC_NUMBER.toString(),
        phases: plannedPhases.map((p) => ({ id: p.id, title: p.title, rank: p.rank })),
        activePhaseId: PR_1020_DISPOSABLE_PHASE_IDS.active,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("[pr-1020-disposable-umsetzungsplanung-fixture] FAILED:", error);
  process.exit(1);
});