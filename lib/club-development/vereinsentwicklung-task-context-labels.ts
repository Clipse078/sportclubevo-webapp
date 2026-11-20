import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveStrategyTitle } from "./club-strategy-service";
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
            clubStrategy: {
              select: {
                id: true,
                title: true,
                scopeType: true,
                scopeOrgUnitId: true,
                orgUnitAssignments: { select: { orgUnitId: true } },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        })
      : [];

  const strategyOrgUnitIds = new Set<string>();
  for (const link of focusLinks) {
    for (const assignment of link.clubStrategy.orgUnitAssignments) {
      strategyOrgUnitIds.add(assignment.orgUnitId);
    }
    if (link.clubStrategy.scopeOrgUnitId) {
      strategyOrgUnitIds.add(link.clubStrategy.scopeOrgUnitId);
    }
  }

  const orgUnits =
    strategyOrgUnitIds.size > 0
      ? await prisma.orgUnit.findMany({
          where: { tenantId, id: { in: [...strategyOrgUnitIds] } },
          select: { id: true, name: true },
        })
      : [];
  const orgNameById = new Map(orgUnits.map((o) => [o.id, o.name]));

  const strategyByTargetId = new Map<string, { id: string; title: string }>();
  for (const link of focusLinks) {
    if (!strategyByTargetId.has(link.targetId)) {
      const strategy = link.clubStrategy;
      const orgUnitIds = [
        ...strategy.orgUnitAssignments.map((a) => a.orgUnitId),
        ...(strategy.scopeOrgUnitId &&
        !strategy.orgUnitAssignments.some((a) => a.orgUnitId === strategy.scopeOrgUnitId)
          ? [strategy.scopeOrgUnitId]
          : []),
      ];
      const orgUnitLabels = orgUnitIds.map((id) => orgNameById.get(id) ?? "Org-Einheit");
      strategyByTargetId.set(link.targetId, {
        id: strategy.id,
        title: resolveStrategyTitle(strategy.title, strategy.scopeType, orgUnitLabels),
      });
    }
  }

  const taskOrgUnitIds = [...new Set(tasks.map((t) => t.orgUnitId).filter((id): id is string => Boolean(id)))];
  const taskOrgUnits =
    taskOrgUnitIds.length > 0
      ? await prisma.orgUnit.findMany({
          where: { tenantId, id: { in: taskOrgUnitIds } },
          select: { id: true, name: true },
        })
      : [];
  const orgLabelById = new Map(taskOrgUnits.map((o) => [o.id, o.name]));

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