import "server-only";

import { DevelopmentSprintStatus, type Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  dedupeTasksById,
  initiativeTaskAssociationOrFilters,
  resolveCanonicalInitiativeIdForTask,
} from "@/lib/club-development/initiative-associated-tasks";
import {
  applyVisibilityFilter,
  buildVisibilityWhere,
} from "@/lib/visibility/visibility-filter";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import type { TaskServiceContext } from "@/lib/tasks/types";
import {
  isSprintPlanningTaskSelectable,
  sprintPlanningExclusionMessage,
} from "./sprint-planning-eligibility";
import type {
  SprintPlanningCatalogDto,
  SprintPlanningInitiativeGroupDto,
  SprintPlanningTaskDto,
} from "./sprint-planning-types";

export type { SprintPlanningCatalogDto, SprintPlanningInitiativeGroupDto, SprintPlanningTaskDto } from "./sprint-planning-types";

const PLANNING_TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  dueAt: true,
  contextType: true,
  contextId: true,
  primaryInitiativeId: true,
  parentTaskId: true,
  visibilityScope: true,
  createdByUserId: true,
  orgUnitId: true,
  assignees: {
    select: { user: { select: { firstName: true, lastName: true } } },
    take: 3,
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskSelect;

type PlanningTaskRow = Prisma.TaskGetPayload<{ select: typeof PLANNING_TASK_SELECT }>;

function assigneeLabels(row: PlanningTaskRow): string[] {
  return row.assignees
    .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim())
    .filter(Boolean);
}

function toPlanningTaskDto(
  row: PlanningTaskRow,
  membership: { inTarget: boolean; otherTitle: string | null },
): SprintPlanningTaskDto {
  const inTargetSprint = membership.inTarget;
  const otherSprintTitle = membership.otherTitle;
  const exclusionReason = sprintPlanningExclusionMessage({
    inTargetSprint,
    otherSprintTitle,
    status: row.status,
  });
  const selectable = isSprintPlanningTaskSelectable({
    inTargetSprint,
    otherSprintTitle,
    status: row.status,
  });
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: TASK_STATUS_LABELS[row.status],
    assigneeLabels: assigneeLabels(row),
    dueAt: row.dueAt?.toISOString() ?? null,
    selectable,
    inTargetSprint,
    otherSprintTitle,
    exclusionReason,
  };
}

async function loadMembershipMaps(
  tenantId: string,
  targetSprintId: string,
  taskIds: string[],
): Promise<Map<string, { inTarget: boolean; otherTitle: string | null }>> {
  if (taskIds.length === 0) return new Map();
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: {
      tenantId,
      taskId: { in: taskIds },
      removedAt: null,
    },
    select: {
      taskId: true,
      sprintId: true,
      sprint: { select: { title: true } },
    },
  });
  const map = new Map<string, { inTarget: boolean; otherTitle: string | null }>();
  for (const id of taskIds) {
    map.set(id, { inTarget: false, otherTitle: null });
  }
  for (const m of memberships) {
    const existing = map.get(m.taskId) ?? { inTarget: false, otherTitle: null };
    if (m.sprintId === targetSprintId) {
      map.set(m.taskId, { inTarget: true, otherTitle: null });
    } else if (!existing.inTarget) {
      map.set(m.taskId, { inTarget: false, otherTitle: m.sprint.title });
    }
  }
  return map;
}

export async function loadSprintPlanningCatalog(
  actor: ActorContext,
  taskCtx: TaskServiceContext,
  targetSprintId: string,
  options: { search?: string } = {},
): Promise<SprintPlanningCatalogDto> {
  const tenantId = actor.tenantId!;
  const search = (options.search ?? "").trim();

  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: targetSprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) {
    return { initiativeGroups: [], standaloneGroup: { tasks: [] } };
  }

  const initiativeRows = await prisma.initiative.findMany({
    where: { tenantId, ...buildVisibilityWhere(actor) },
    select: {
      id: true,
      slug: true,
      title: true,
      visibilityScope: true,
      createdByUserId: true,
      visibleRoleRefs: true,
      visibleUserRefs: true,
      visibleTeamRefs: true,
      visibleOrgUnitRefs: true,
      visiblePersonRefs: true,
      visibleTargetGroupRefs: true,
    },
    orderBy: [{ title: "asc" }],
  });
  const visibleInitiatives = applyVisibilityFilter(initiativeRows, actor).filter((init) => {
    if (!search) return true;
    return init.title.toLowerCase().includes(search.toLowerCase());
  });
  const visibleInitiativeIds = new Set(visibleInitiatives.map((i) => i.id));

  const readWhere = buildTaskReadWhere(taskCtx);
  const baseTaskWhere: Prisma.TaskWhereInput = {
    tenantId,
    parentTaskId: null,
    status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
    AND: [readWhere],
  };

  const initiativeGroups: SprintPlanningInitiativeGroupDto[] = [];
  const groupedTaskIds = new Set<string>();

  for (const initiative of visibleInitiatives) {
    const orFilters = initiativeTaskAssociationOrFilters(initiative.id);
    const titleFilter: Prisma.TaskWhereInput | null =
      search.length >= 2
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : null;

    const rows = await prisma.task.findMany({
      where: {
        ...baseTaskWhere,
        OR: orFilters,
        ...(titleFilter ? { AND: [titleFilter] } : {}),
      },
      select: PLANNING_TASK_SELECT,
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      take: 500,
    });

    const deduped = dedupeTasksById(rows);
    for (const row of deduped) {
      groupedTaskIds.add(row.id);
    }

    const membershipMap = await loadMembershipMaps(
      tenantId,
      targetSprintId,
      deduped.map((r) => r.id),
    );

    initiativeGroups.push({
      initiativeId: initiative.id,
      title: initiative.title,
      slug: initiative.slug,
      tasks: deduped.map((row) => toPlanningTaskDto(row, membershipMap.get(row.id)!)),
    });
  }

  const standaloneWhere: Prisma.TaskWhereInput = {
    ...baseTaskWhere,
    ...(search.length >= 2
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const standaloneRows = await prisma.task.findMany({
    where: standaloneWhere,
    select: PLANNING_TASK_SELECT,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: 800,
  });

  const finalStandalone = dedupeTasksById(standaloneRows)
    .filter((row) => {
      if (groupedTaskIds.has(row.id)) return false;
      const canonicalInitiativeId = resolveCanonicalInitiativeIdForTask(row);
      if (canonicalInitiativeId && visibleInitiativeIds.has(canonicalInitiativeId)) {
        return false;
      }
      return true;
    });

  const standaloneMembershipMap = await loadMembershipMaps(
    tenantId,
    targetSprintId,
    finalStandalone.map((r) => r.id),
  );

  return {
    initiativeGroups,
    standaloneGroup: {
      tasks: finalStandalone.map((row) =>
        toPlanningTaskDto(row, standaloneMembershipMap.get(row.id)!),
      ),
    },
  };
}

export async function assertSprintPlanningMutable(
  tenantId: string,
  sprintId: string,
): Promise<{ id: string; status: DevelopmentSprintStatus }> {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) {
    throw new Error("Sprint nicht gefunden.");
  }
  if (sprint.status === DevelopmentSprintStatus.COMPLETED) {
    throw new Error("Abgeschlossene Sprints können nicht mehr geplant werden.");
  }
  return sprint;
}