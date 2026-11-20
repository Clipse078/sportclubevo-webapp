import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TaskContextLabelBundle } from "./vereinsentwicklung-task-context-labels-types";

export type { TaskContextLabelBundle } from "./vereinsentwicklung-task-context-labels-types";

type TaskContextInput = {
  id: string;
  contextType: TaskContextType | null;
  contextId: string | null;
  orgUnitId: string | null;
};

export async function loadTaskContextLabelBundles(
  tenantId: string,
  tasks: readonly TaskContextInput[],
): Promise<Map<string, TaskContextLabelBundle>> {
  const targetIds = [
    ...new Set(
      tasks
        .filter((t) => t.contextType === TaskContextType.TARGET && t.contextId)
        .map((t) => t.contextId!),
    ),
  ];

  const targets =
    targetIds.length > 0
      ? await prisma.target.findMany({
          where: { tenantId, id: { in: targetIds } },
          select: { id: true, title: true },
        })
      : [];
  const targetTitleById = new Map(targets.map((t) => [t.id, t.title]));

  const focusLinks =
    targetIds.length > 0
      ? await prisma.clubStrategyFocusTarget.findMany({
          where: { tenantId, targetId: { in: targetIds } },
          select: {
            targetId: true,
            clubStrategy: { select: { id: true, title: true } },
          },
          orderBy: { sortOrder: "asc" },
        })
      : [];
  const strategyByTargetId = new Map<string, { id: string; title: string }>();
  for (const link of focusLinks) {
    if (!strategyByTargetId.has(link.targetId)) {
      strategyByTargetId.set(link.targetId, {
        id: link.clubStrategy.id,
        title: link.clubStrategy.title?.trim() || "Strategie",
      });
    }
  }

  const orgUnitIds = [...new Set(tasks.map((t) => t.orgUnitId).filter((id): id is string => Boolean(id)))];
  const orgUnits =
    orgUnitIds.length > 0
      ? await prisma.orgUnit.findMany({
          where: { tenantId, id: { in: orgUnitIds } },
          select: { id: true, name: true },
        })
      : [];
  const orgLabelById = new Map(orgUnits.map((o) => [o.id, o.name]));

  const bundles = new Map<string, TaskContextLabelBundle>();
  for (const task of tasks) {
    const targetId =
      task.contextType === TaskContextType.TARGET && task.contextId ? task.contextId : null;
    const strategy = targetId ? strategyByTargetId.get(targetId) : undefined;
    bundles.set(task.id, {
      targetId,
      targetTitle: targetId ? targetTitleById.get(targetId) ?? null : null,
      strategyId: strategy?.id ?? null,
      strategyTitle: strategy?.title ?? null,
      orgUnitLabel: task.orgUnitId ? orgLabelById.get(task.orgUnitId) ?? null : null,
    });
  }
  return bundles;
}