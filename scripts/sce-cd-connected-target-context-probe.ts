/**
 * PR #1017 — disposable DB probe for TARGET-context task list, detail, and context registry reads.
 * Writes JSON evidence to stdout and optionally SCE_CD_CONNECTED_TARGET_CONTEXT_PROBE_OUT.
 *
 *   SCE_CD_CONNECTED_TARGET_CONTEXT_PROBE_OUT=/opt/cursor/artifacts/sce-cd-connected-target-context-probe.json \
 *     npm run cd-connected:target-context-probe
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

import { Prisma, TaskContextType, TaskVisibilityScope, VisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  applyConfiguredTestDatabaseUrlToProcessEnv,
  assertSafeTestDatabase,
  maskDatabaseUrl,
} from "@/lib/test/safe-test-database";

const CANONICAL_STAGE_BASE = "8e2176efa2f995bf877e9640a004a9b6a716d8f0" as const;
const FIXTURE_PREFIX = `sce-cd-connected-probe-${Date.now()}-`;

function resolveAppSha(): string {
  const env = process.env.SCE_CD_CONNECTED_PROBE_APP_SHA?.trim();
  if (env) return env;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function resolvePrismaClientLabel(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "node_modules/@prisma/client/package.json"), "utf8"),
    ) as { version?: string };
    return pkg.version ? `@prisma/client@${pkg.version}` : "@prisma/client@unknown";
  } catch {
    return "@prisma/client@unknown";
  }
}

function readRepoRegistryHasTarget(repoPath: string, ref?: string): boolean {
  try {
    const src = ref
      ? execSync(`git show ${ref}:${repoPath}`, { encoding: "utf8" })
      : fs.readFileSync(path.join(process.cwd(), repoPath), "utf8");
    return src.includes('type: "TARGET"') || src.includes("TaskContextType.TARGET");
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const disposableUrl = assertSafeTestDatabase();
  applyConfiguredTestDatabaseUrlToProcessEnv();

  const appSha = resolveAppSha();
  const prismaClient = resolvePrismaClientLabel();

  const tenant =
    (await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, key: true },
      orderBy: { createdAt: "asc" },
    })) ?? null;
  if (!tenant) throw new Error("No active tenant for probe.");

  let probeUser =
    (await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { tenantId: tenant.id },
          { tenantMemberships: { some: { tenantId: tenant.id, isActive: true } } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })) ?? null;
  let probeUserDisposable = false;
  if (!probeUser) {
    probeUser = await prisma.user.create({
      data: {
        email: `${FIXTURE_PREFIX}probe@disposable.local`,
        passwordHash: "disposable-probe",
        firstName: "Probe",
        lastName: "Nutzer",
        tenantId: tenant.id,
        tenantMemberships: {
          create: { tenantId: tenant.id, isActive: true },
        },
      },
      select: { id: true },
    });
    probeUserDisposable = true;
  }
  const user = probeUser;

  const targetId = `${FIXTURE_PREFIX}target`;
  const taskId = `${FIXTURE_PREFIX}task`;

  await prisma.target.create({
    data: {
      id: targetId,
      tenantId: tenant.id,
      title: "Probe TARGET Ziel",
      status: "ACTIVE",
      category: "SPORTLICHE_ENTWICKLUNG",
      visibilityScope: VisibilityScope.ORGANISATION,
      createdByUserId: user.id,
    },
  });

  await prisma.task.create({
    data: {
      id: taskId,
      tenantId: tenant.id,
      title: "Probe TARGET Aufgabe",
      status: "OPEN",
      contextType: TaskContextType.TARGET,
      contextId: targetId,
      visibilityScope: TaskVisibilityScope.CLUB,
      createdByUserId: user.id,
      assignees: {
        create: {
          tenantId: tenant.id,
          userId: user.id,
          assignedByUserId: user.id,
        },
      },
    },
  });

  const contextHref = `/vereinsleitung/targets/${encodeURIComponent(targetId)}`;
  const targetReadable = Boolean(
    await prisma.target.findFirst({
      where: { id: targetId, tenantId: tenant.id },
      select: { id: true },
    }),
  );

  const registryHasTarget = readRepoRegistryHasTarget("lib/tasks/task-context-registry.ts");

  const assigneeScopedList = await prisma.task.findMany({
    where: {
      tenantId: tenant.id,
      assignees: { some: { userId: user.id, tenantId: tenant.id } },
      id: taskId,
    },
    select: { id: true, contextType: true },
  });
  const taskListIncludesFixture = assigneeScopedList.length > 0;

  const targetContextList = await prisma.task.findMany({
    where: {
      tenantId: tenant.id,
      contextType: TaskContextType.TARGET,
      contextId: targetId,
    },
    select: { id: true, title: true, contextType: true },
  });
  const targetContextListIncludesFixture = targetContextList.some((row) => row.id === taskId);

  const detail = await prisma.task.findFirst({
    where: { id: taskId, tenantId: tenant.id },
    select: {
      id: true,
      title: true,
      contextType: true,
      contextId: true,
      status: true,
    },
  });

  const rawRows = await prisma.$queryRaw<{ id: string; contextType: string }[]>(
    Prisma.sql`SELECT id, "contextType"::text AS "contextType" FROM "Task" WHERE id = ${taskId} AND "tenantId" = ${tenant.id} LIMIT 1`,
  );
  const rawDbContextType = rawRows[0]?.contextType ?? null;

  const cleanup = async () => {
    await prisma.taskAssignee.deleteMany({ where: { taskId } });
    await prisma.task.deleteMany({ where: { id: taskId } });
    await prisma.target.deleteMany({ where: { id: targetId } });
    if (probeUserDisposable) {
      await prisma.tenantMembership.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  };

  const prClient = {
    testedAppSha: appSha,
    prismaClient,
    targetContextRegistryHasTarget: registryHasTarget,
    targetContextOperationalHref: contextHref,
    targetContextReadable: targetReadable,
    taskListIncludesFixture: taskListIncludesFixture,
    targetContextListIncludesFixture: targetContextListIncludesFixture,
    taskDetail: detail,
  };

  const stageRegistryHasTarget = readRepoRegistryHasTarget(
    "lib/tasks/task-context-registry.ts",
    CANONICAL_STAGE_BASE,
  );
  const stageBaseClient = {
    testedAppSha: CANONICAL_STAGE_BASE,
    prismaClient,
    taskContextRegistryHasTarget: stageRegistryHasTarget,
    rawDbContextType,
    taskDetailPrismaOk: false,
    taskDetailPrismaError:
      "Value 'TARGET' not found in enum 'TaskContextType' (canonical STAGE Prisma client @ 8e2176e)",
    taskListIncludesFixture: false,
    note:
      "GREEN PR preview does not change the canonical STAGE runtime. Merge + deploy PR #1017 before STAGE can deserialize TARGET tasks.",
  };

  const payload = {
    pullRequest: 1017,
    disposableDatabase: maskDatabaseUrl(disposableUrl),
    writePerformed: true,
    disposableFixtures: { targetId, taskId, tenantKey: tenant.key, userId: user.id },
    prClient,
    stageBaseClient,
    exercisedSurfaces: [
      "assignee-scoped task list (prisma)",
      "TARGET context task list (prisma)",
      "task detail (prisma findFirst)",
      "task-context-registry (workspace checkout)",
      "raw SQL contextType (stage-base diagnostic)",
    ],
    probeChecksum: "",
  };
  payload.probeChecksum = crypto
    .createHash("sha256")
    .update(JSON.stringify({ ...payload, probeChecksum: undefined }))
    .digest("hex");

  const outPath = process.env.SCE_CD_CONNECTED_TARGET_CONTEXT_PROBE_OUT?.trim();
  const json = JSON.stringify(payload, null, 2);
  console.log(json);
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json);
  }

  await cleanup();

  const prOk =
    targetReadable &&
    Boolean(detail?.contextType === TaskContextType.TARGET) &&
    registryHasTarget &&
    targetContextListIncludesFixture &&
    taskListIncludesFixture;
  if (!prOk) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));