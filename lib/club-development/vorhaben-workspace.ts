import "server-only";

import {
  TaskContextType,
  TaskStatus,
  type InitiativeStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter } from "@/lib/visibility/visibility-filter";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import {
  dedupeTasksById,
  initiativeTaskAssociationOrFilters,
  resolveCanonicalInitiativeIdForTask,
} from "@/lib/club-development/initiative-associated-tasks";
import { computeInitiativeProgressSnapshot } from "@/lib/club-development/initiative-progress";
import { listInitiativeBacklog } from "@/lib/club-development/initiative-backlog";

const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const INITIATIVE_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  status: true,
  visibilityScope: true,
  createdByUserId: true,
  visibleRoleRefs: true,
  visibleUserRefs: true,
  visibleTeamRefs: true,
  visibleOrgUnitRefs: true,
  visiblePersonRefs: true,
  visibleTargetGroupRefs: true,
} satisfies Prisma.InitiativeSelect;

const TASK_ROW_SELECT = {
  id: true,
  title: true,
  status: true,
  contextType: true,
  contextId: true,
  primaryInitiativeId: true,
  dueAt: true,
  assignees: {
    select: { user: { select: { firstName: true, lastName: true } } },
    take: 3,
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_ROW_SELECT }>;

export type VorhabenWorkspaceFilters = {
  search?: string;
  initiativeId?: string;
  targetId?: string;
  initiativeStatus?: InitiativeStatus;
  taskStatus?: TaskStatus;
};

export type VorhabenWorkspaceInitiativeRow = {
  id: string;
  slug: string;
  title: string;
  status: InitiativeStatus;
  statusLabel: string;
  progress: number;
  openRootTaskCount: number;
  detailHref: string;
  workHref: string;
};

export type VorhabenWorkspaceTaskLinkKind =
  | "INITIATIVE_CONTEXT"
  | "PRIMARY_INITIATIVE"
  | "MEETING_DECISION";

export type VorhabenWorkspaceTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  dueAt: string | null;
  assigneeLabels: string[];
  href: string;
  initiativeId: string | null;
  initiativeTitle: string | null;
  initiativeSlug: string | null;
  linkKind: VorhabenWorkspaceTaskLinkKind;
  isRootTask: true;
};

export type VorhabenWorkspaceSnapshot = {
  initiatives: VorhabenWorkspaceInitiativeRow[];
  tasks: VorhabenWorkspaceTaskRow[];
  canViewInitiatives: boolean;
  canViewTasks: boolean;
  canManageInitiatives: boolean;
  canManageTasks: boolean;
  restrictedReason: string | null;
};

function actorCanViewInitiatives(actor: ActorContext): boolean {
  return actor.permissionKeys.some(
    (k) => k === PERMISSIONS.INITIATIVES_VIEW || k === PERMISSIONS.INITIATIVES_MANAGE,
  );
}

function actorCanViewTasks(actor: ActorContext): boolean {
  return actor.permissionKeys.some(
    (k) => k === PERMISSIONS.TASKS_VIEW || k === PERMISSIONS.TASKS_MANAGE,
  );
}

function assigneeLabels(row: TaskRow): string[] {
  return row.assignees
    .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim())
    .filter((label) => label.length > 0);
}

function taskLinkKind(row: TaskRow, initiativeId: string | null): VorhabenWorkspaceTaskLinkKind {
  if (row.contextType === TaskContextType.INITIATIVE && row.contextId === initiativeId) {
    return "INITIATIVE_CONTEXT";
  }
  if (row.contextType === TaskContextType.MEETING_DECISION) {
    return "MEETING_DECISION";
  }
  return "PRIMARY_INITIATIVE";
}

async function meetingDecisionIdsForInitiative(
  tenantId: string,
  initiativeId: string,
): Promise<string[]> {
  const agendaItemIds = await prisma.meetingAgendaItem.findMany({
    where: { initiativeId, meeting: { tenantId } },
    select: { id: true },
  });
  const agendaIds = agendaItemIds.map((row) => row.id);
  if (agendaIds.length === 0) return [];
  const decisions = await prisma.meetingDecision.findMany({
    where: {
      sourceAgendaItemId: { in: agendaIds },
      meeting: { tenantId },
    },
    select: { id: true },
  });
  return decisions.map((row) => row.id);
}

function buildTaskAssociationWhere(initiativeIds: string[]): Prisma.TaskWhereInput[] {
  const orFilters: Prisma.TaskWhereInput[] = [];
  for (const initiativeId of initiativeIds) {
    orFilters.push(...initiativeTaskAssociationOrFilters(initiativeId));
  }
  return orFilters;
}

async function resolveTaskOrFilters(
  tenantId: string,
  initiativeIds: string[],
  filters: VorhabenWorkspaceFilters,
): Promise<Prisma.TaskWhereInput[]> {
  if (initiativeIds.length === 0) return [];

  const orFilters = buildTaskAssociationWhere(initiativeIds);

  if (filters.initiativeId?.trim()) {
    const decisionIds = await meetingDecisionIdsForInitiative(
      tenantId,
      filters.initiativeId.trim(),
    );
    if (decisionIds.length > 0) {
      orFilters.push({
        contextType: TaskContextType.MEETING_DECISION,
        contextId: { in: decisionIds },
      });
    }
  }

  return orFilters;
}

function mapTaskRows(
  rows: TaskRow[],
  initiativeById: Map<string, { id: string; title: string; slug: string }>,
  returnTo: string,
): VorhabenWorkspaceTaskRow[] {
  const deduped = dedupeTasksById(rows);
  return deduped.map((row) => {
    const initiativeId = resolveCanonicalInitiativeIdForTask(row);
    const initiative = initiativeId ? initiativeById.get(initiativeId) : null;
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      statusLabel: TASK_STATUS_LABELS[row.status],
      dueAt: row.dueAt?.toISOString() ?? null,
      assigneeLabels: assigneeLabels(row),
      href: taskWorkspaceHref(row.id, { returnTo }),
      initiativeId: initiative?.id ?? initiativeId,
      initiativeTitle: initiative?.title ?? null,
      initiativeSlug: initiative?.slug ?? null,
      linkKind: taskLinkKind(row, initiativeId),
      isRootTask: true,
    };
  });
}

export async function loadVorhabenWorkspace(
  actor: ActorContext,
  filters: VorhabenWorkspaceFilters = {},
  options?: { returnToPath?: string },
): Promise<VorhabenWorkspaceSnapshot> {
  const canViewInitiatives = actorCanViewInitiatives(actor);
  const canViewTasks = actorCanViewTasks(actor);
  const canManageInitiatives = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);
  const canManageTasks = actor.permissionKeys.includes(PERMISSIONS.TASKS_MANAGE);

  if (!actor.tenantId) {
    return {
      initiatives: [],
      tasks: [],
      canViewInitiatives,
      canViewTasks,
      canManageInitiatives,
      canManageTasks,
      restrictedReason: "Kein Mandant ausgewählt.",
    };
  }

  if (!canViewInitiatives && !canViewTasks) {
    return {
      initiatives: [],
      tasks: [],
      canViewInitiatives,
      canViewTasks,
      canManageInitiatives,
      canManageTasks,
      restrictedReason:
        "Für Vorhaben & Aufgaben benötigen Sie mindestens Leseberechtigung für Vorhaben oder Aufgaben.",
    };
  }

  const returnTo = options?.returnToPath ?? "/vereinsleitung/vorhaben";

  let initiatives: VorhabenWorkspaceInitiativeRow[] = [];
  const initiativeById = new Map<string, { id: string; title: string; slug: string }>();

  if (canViewInitiatives) {
    const initiativeRows = await listInitiativeBacklog(actor, {
      search: filters.search,
      targetId: filters.targetId,
      status: filters.initiativeStatus,
    });
    const filteredByInitiative = filters.initiativeId?.trim()
      ? initiativeRows.filter((row) => row.id === filters.initiativeId!.trim())
      : initiativeRows;
    const sorted = [...filteredByInitiative].sort((a, b) => a.title.localeCompare(b.title, "de"));

    const taskCtx = canViewTasks ? await getTaskServiceContext() : null;
    const openCounts = new Map<string, number>();

    if (taskCtx && sorted.length > 0) {
      const ids = sorted.map((row) => row.id);
      const taskOr = await resolveTaskOrFilters(actor.tenantId, ids, filters);
      if (taskOr.length > 0) {
        const openTasks = await prisma.task.findMany({
          where: {
            tenantId: actor.tenantId,
            parentTaskId: null,
            status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
            AND: [buildTaskReadWhere(taskCtx)],
            OR: taskOr,
          },
          select: {
            id: true,
            contextType: true,
            contextId: true,
            primaryInitiativeId: true,
          },
        });
        for (const task of openTasks) {
          const key = resolveCanonicalInitiativeIdForTask(task);
          if (!key || !ids.includes(key)) continue;
          openCounts.set(key, (openCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const withProgress = await Promise.all(
      sorted.map(async (row) => {
        const snapshot = await computeInitiativeProgressSnapshot(actor.tenantId!, row.id);
        initiativeById.set(row.id, { id: row.id, title: row.title, slug: row.slug });
        const workQuery = new URLSearchParams({ initiativeId: row.id });
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status,
          statusLabel: INITIATIVE_STATUS_LABELS[row.status],
          progress: snapshot.progress,
          openRootTaskCount: openCounts.get(row.id) ?? 0,
          detailHref: `/vereinsleitung/initiativen/${encodeURIComponent(row.slug)}`,
          workHref: `/vereinsleitung/vorhaben?${workQuery.toString()}`,
        } satisfies VorhabenWorkspaceInitiativeRow;
      }),
    );
    initiatives = withProgress;
  }

  let tasks: VorhabenWorkspaceTaskRow[] = [];

  if (canViewTasks) {
    const taskCtx = await getTaskServiceContext();
    if (!taskCtx) {
      return {
        initiatives,
        tasks: [],
        canViewInitiatives,
        canViewTasks,
        canManageInitiatives,
        canManageTasks,
        restrictedReason: canViewInitiatives
          ? "Aufgaben konnten nicht geladen werden — fehlende Aufgaben-Berechtigung in der Sitzung."
          : null,
      };
    }

    const initiativeIds = initiatives.map((row) => row.id);
    if (initiativeIds.length === 0 && filters.initiativeId?.trim()) {
      return {
        initiatives,
        tasks: [],
        canViewInitiatives,
        canViewTasks,
        canManageInitiatives,
        canManageTasks,
        restrictedReason: "Das gewählte Vorhaben ist nicht sichtbar oder existiert nicht.",
      };
    }

    const taskOr =
      initiativeIds.length > 0
        ? await resolveTaskOrFilters(actor.tenantId, initiativeIds, filters)
        : [];

    if (taskOr.length > 0) {
      const statusFilter = filters.taskStatus
        ? { status: filters.taskStatus }
        : { status: { not: TaskStatus.CANCELLED } };

      let taskRows = await prisma.task.findMany({
        where: {
          tenantId: actor.tenantId,
          parentTaskId: null,
          ...statusFilter,
          AND: [
            buildTaskReadWhere(taskCtx),
            filters.search?.trim()
              ? {
                  OR: [
                    { title: { contains: filters.search.trim(), mode: "insensitive" } },
                    { description: { contains: filters.search.trim(), mode: "insensitive" } },
                  ],
                }
              : {},
          ],
          OR: taskOr,
        },
        select: TASK_ROW_SELECT,
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        take: 80,
      });

      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        const initiativeMatches = initiatives.filter((row) =>
          row.title.toLowerCase().includes(q),
        );
        if (initiativeMatches.length > 0 && taskRows.length < 80) {
          const extraOr = await resolveTaskOrFilters(
            actor.tenantId,
            initiativeMatches.map((row) => row.id),
            { ...filters, search: undefined },
          );
          if (extraOr.length > 0) {
            const extra = await prisma.task.findMany({
              where: {
                tenantId: actor.tenantId,
                parentTaskId: null,
                ...statusFilter,
                AND: [buildTaskReadWhere(taskCtx)],
                OR: extraOr,
              },
              select: TASK_ROW_SELECT,
              orderBy: [{ updatedAt: "desc" }],
              take: 80,
            });
            taskRows = dedupeTasksById([...taskRows, ...extra]);
          }
        }
      }

      for (const row of initiatives) {
        if (!initiativeById.has(row.id)) {
          initiativeById.set(row.id, { id: row.id, title: row.title, slug: row.slug });
        }
      }

      const missingIds = new Set<string>();
      for (const row of taskRows) {
        const id = resolveCanonicalInitiativeIdForTask(row);
        if (id && !initiativeById.has(id)) missingIds.add(id);
      }
      if (missingIds.size > 0) {
        const extraInitiatives = await prisma.initiative.findMany({
          where: { tenantId: actor.tenantId, id: { in: [...missingIds] } },
          select: INITIATIVE_LIST_SELECT,
        });
        for (const row of applyVisibilityFilter(extraInitiatives, actor)) {
          initiativeById.set(row.id, {
            id: row.id,
            title: row.title,
            slug: row.slug,
          });
        }
      }

      tasks = mapTaskRows(taskRows, initiativeById, returnTo);
    }
  }

  return {
    initiatives,
    tasks,
    canViewInitiatives,
    canViewTasks,
    canManageInitiatives,
    canManageTasks,
    restrictedReason: null,
  };
}