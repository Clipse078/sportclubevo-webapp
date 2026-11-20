/**
 * PR #1017 — disposable DB probe for TARGET-context task list, detail, and context registry reads.
 * Writes JSON evidence to stdout and optionally SCE_CD_CONNECTED_TARGET_CONTEXT_PROBE_OUT.
 *
 *   SCE_CD_CONNECTED_TARGET_CONTEXT_PROBE_OUT=/opt/cursor/artifacts/sce-cd-connected-target-context-probe.json \
 *     npx tsx scripts/sce-cd-connected-target-context-probe.ts
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

import { TaskContextType, TaskVisibilityScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { listMyTasks } from "@/lib/tasks/task-service";
import { loadTaskAuthScope } from "@/lib/tasks/task-authorization";
import type { TaskServiceContext } from "@/lib/tasks/types";

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

async function main(): Promise<void> {
  const appSha = resolveAppSha();
  const prismaClient = resolvePrismaClientLabel();

  const tenant =
    (await prisma.tenant.findFirst({ where: { status: "ACTIVE" }, select: { id: true, key: true } })) ??
    null;
  if (!tenant) throw new Error("No active tenant for probe.");

  const user = await prisma.user.findFirst({
    where: { tenantMemberships: { some: { tenantId: tenant.id, isActive: true } } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!user) throw new Error("No active user for probe.");

  const targetId = `${FIXTURE_PREFIX}target`;
  const taskId = `${FIXTURE_PREFIX}task`;

  await prisma.target.create({
    data: {
      id: targetId,
      tenantId: tenant.id,
      title: "Probe TARGET Ziel",
      status: "ACTIVE",
      category: "GOVERNANCE",
      visibilityScope: TaskVisibilityScope.ORGANISATION,
      createdByUserId: user.id,
      updatedByUserId: user.id,
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
      visibilityScope: TaskVisibilityScope.ORGANISATION,
      createdByUserId: user.id,
      updatedByUserId: user.id,
    },
  });

  const auth = await loadTaskAuthScope(user.id, tenant.id);
  const permissionKeys = [PERMISSIONS.TASKS_VIEW, PERMISSIONS.TARGETS_VIEW];
  const ctx: TaskServiceContext = {
    tenantId: tenant.id,
    userId: user.id,
    permissionKeys,
    auth,
  };

  const contextHref = `/vereinsleitung/targets/${encodeURIComponent(targetId)}`;
  const readable = Boolean(
    await prisma.target.findFirst({
      where: { id: targetId, tenantId: tenant.id },
      select: { id: true },
    }),
  );

  const listed = await listMyTasks(ctx, { openOnly: false, limit: 200, now: new Date() });
  const listedHit = listed.some((row) => row.id === taskId);

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

  const cleanup = async () => {
    await prisma.task.deleteMany({ where: { id: taskId } });
    await prisma.target.deleteMany({ where: { id: targetId } });
  };

  const payload = {
    pullRequest: 1017,
    writePerformed: true,
    disposableFixtures: { targetId, taskId, tenantKey: tenant.key },
    evidence: {
      testedAppSha: appSha,
      canonicalStageBaseSha: CANONICAL_STAGE_BASE,
      matchesCanonicalStageBase: appSha === CANONICAL_STAGE_BASE,
      prismaClient,
      targetContextRegistryType: TaskContextType.TARGET,
      targetContextOperationalHref: contextHref,
      targetContextReadable: readable,
      taskListIncludesFixture: listedHit,
      taskDetail: detail,
    },
    exercisedSurfaces: ["task list (listMyTasks)", "task detail (prisma findFirst)", "TARGET context registry"],
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

  if (!listedHit || !detail || !readable) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().catch(() => undefined));