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
import { CD_SPRINT_API_COPY, CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import {
  isSprintPlanningEligibleStatus,
  isSprintPlanningTaskSelectable,
  sprintPlanningExclusionMessage,
} from "./sprint-planning-eligibility";
import { loadSprintTaskAssigneeViewModels, type SprintTaskAssigneeViewModel } from "./sprint-task-assignee";
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
    select: { userId: true },
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskSelect;

type PlanningTaskRow = Prisma.TaskGetPayload<{ select: typeof PLANNING_TASK_SELECT }>;

function assigneesForRow(
  row: PlanningTaskRow,
  byUserId: Map<string, SprintTaskAssigneeViewModel>,
): SprintTaskAssigneeViewModel[] {
  return row.assignees
    .map((a) => byUserId.get(a.userId))
    .filter((a): a is SprintTaskAssigneeViewModel => Boolean(a));
}

function toPlanningTaskDto(
  row: PlanningTaskRow,
  membership: { inTarget: boolean; otherTitle: string | null },
  byUserId: Map<string, SprintTaskAssigneeViewModel>,
): SprintPlanningTaskDto {
  const assignees = assigneesForRow(row, byUserId);
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
    assignees,
    assigneeLabels: assignees.map((a) => a.displayName),
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

  type PendingInitiativeGroup = {
    initiativeId: string;
    title: string;
    slug: string;
    deduped: PlanningTaskRow[];
    membershipMap: Map<string, { inTarget: boolean; otherTitle: string | null }>;
  };
  const pendingInitiativeGroups: PendingInitiativeGroup[] = [];
  const groupedTaskIds = new Set<string>();
  const catalogRows: PlanningTaskRow[] = [];

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
      catalogRows.push(row);
    }

    const membershipMap = await loadMembershipMaps(
      tenantId,
      targetSprintId,
      deduped.map((r) => r.id),
    );

    pendingInitiativeGroups.push({
      initiativeId: initiative.id,
      title: initiative.title,
      slug: initiative.slug,
      deduped,
      membershipMap,
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

  for (const row of finalStandalone) {
    catalogRows.push(row);
  }

  const assigneeByUserId = new Map(
    (
      await loadSprintTaskAssigneeViewModels(
        tenantId,
        catalogRows.flatMap((row) => row.assignees.map((a) => a.userId)),
      )
    ).map((a) => [a.userId, a] as const),
  );

  const initiativeGroups: SprintPlanningInitiativeGroupDto[] = pendingInitiativeGroups.map((group) => ({
    initiativeId: group.initiativeId,
    title: group.title,
    slug: group.slug,
    tasks: group.deduped.map((row) =>
      toPlanningTaskDto(row, group.membershipMap.get(row.id)!, assigneeByUserId),
    ),
  }));

  return {
    initiativeGroups,
    standaloneGroup: {
      tasks: finalStandalone.map((row) =>
        toPlanningTaskDto(row, standaloneMembershipMap.get(row.id)!, assigneeByUserId),
      ),
    },
  };
}

type OpenPhaseMembership = { inOpenPhase: boolean; openPhaseTitle: string | null };

async function loadOpenPhaseMembershipMaps(
  tenantId: string,
  taskIds: string[],
): Promise<Map<string, OpenPhaseMembership>> {
  if (taskIds.length === 0) return new Map();
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: {
      tenantId,
      taskId: { in: taskIds },
      removedAt: null,
      sprint: { status: { in: [DevelopmentSprintStatus.PLANNED, DevelopmentSprintStatus.ACTIVE] } },
    },
    select: {
      taskId: true,
      sprint: { select: { title: true } },
    },
  });
  const map = new Map<string, OpenPhaseMembership>();
  for (const id of taskIds) {
    map.set(id, { inOpenPhase: false, openPhaseTitle: null });
  }
  for (const m of memberships) {
    map.set(m.taskId, { inOpenPhase: true, openPhaseTitle: m.sprint.title });
  }
  return map;
}

function toUnplannedTaskDto(
  row: PlanningTaskRow,
  membership: OpenPhaseMembership,
  byUserId: Map<string, SprintTaskAssigneeViewModel>,
): SprintPlanningTaskDto {
  const assignees = assigneesForRow(row, byUserId);
  const inOpenPhase = membership.inOpenPhase;
  const otherSprintTitle = membership.openPhaseTitle;
  const exclusionReason = inOpenPhase
    ? CD_SPRINT_API_COPY.alreadyInPhaseNamed(otherSprintTitle ?? CD_SPRINT_WORKSPACE_COPY.futurePhase)
    : !isSprintPlanningEligibleStatus(row.status)
      ? "Abgeschlossene oder abgebrochene Aufgaben können nicht geplant werden."
      : null;
  const selectable = !inOpenPhase && isSprintPlanningEligibleStatus(row.status);
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: TASK_STATUS_LABELS[row.status],
    assignees,
    assigneeLabels: assignees.map((a) => a.displayName),
    dueAt: row.dueAt?.toISOString() ?? null,
    selectable,
    inTargetSprint: false,
    otherSprintTitle: inOpenPhase ? otherSprintTitle : null,
    exclusionReason,
  };
}

/** Root tasks not assigned to any planned or active Umsetzungsphase (parent tasks only). */
export async function loadUnplannedTasksCatalog(
  actor: ActorContext,
  taskCtx: TaskServiceContext,
  options: { search?: string } = {},
): Promise<SprintPlanningCatalogDto> {
  const tenantId = actor.tenantId!;
  const search = (options.search ?? "").trim();

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

  type PendingInitiativeGroup = {
    initiativeId: string;
    title: string;
    slug: string;
    deduped: PlanningTaskRow[];
    membershipMap: Map<string, OpenPhaseMembership>;
  };
  const pendingInitiativeGroups: PendingInitiativeGroup[] = [];
  const groupedTaskIds = new Set<string>();
  const catalogRows: PlanningTaskRow[] = [];

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
      catalogRows.push(row);
    }

    const membershipMap = await loadOpenPhaseMembershipMaps(
      tenantId,
      deduped.map((r) => r.id),
    );

    pendingInitiativeGroups.push({
      initiativeId: initiative.id,
      title: initiative.title,
      slug: initiative.slug,
      deduped,
      membershipMap,
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

  const finalStandalone = dedupeTasksById(standaloneRows).filter((row) => {
    if (groupedTaskIds.has(row.id)) return false;
    const canonicalInitiativeId = resolveCanonicalInitiativeIdForTask(row);
    if (canonicalInitiativeId && visibleInitiativeIds.has(canonicalInitiativeId)) {
      return false;
    }
    return true;
  });

  const standaloneMembershipMap = await loadOpenPhaseMembershipMaps(
    tenantId,
    finalStandalone.map((r) => r.id),
  );

  for (const row of finalStandalone) {
    catalogRows.push(row);
  }

  const assigneeByUserId = new Map(
    (
      await loadSprintTaskAssigneeViewModels(
        tenantId,
        catalogRows.flatMap((row) => row.assignees.map((a) => a.userId)),
      )
    ).map((a) => [a.userId, a] as const),
  );

  const mapGroups = (groups: PendingInitiativeGroup[]): SprintPlanningInitiativeGroupDto[] =>
    groups
      .map((group) => ({
        initiativeId: group.initiativeId,
        title: group.title,
        slug: group.slug,
        tasks: group.deduped
          .map((row) => toUnplannedTaskDto(row, group.membershipMap.get(row.id)!, assigneeByUserId))
          .filter((t) => t.selectable),
      }))
      .filter((g) => g.tasks.length > 0);

  return {
    initiativeGroups: mapGroups(pendingInitiativeGroups),
    standaloneGroup: {
      tasks: finalStandalone
        .map((row) => toUnplannedTaskDto(row, standaloneMembershipMap.get(row.id)!, assigneeByUserId))
        .filter((t) => t.selectable),
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
    throw new Error("Umsetzungsphase nicht gefunden.");
  }
  if (sprint.status === DevelopmentSprintStatus.COMPLETED) {
    throw new Error("Abgeschlossene Umsetzungsphasen können nicht mehr geplant werden.");
  }
  return sprint;
}