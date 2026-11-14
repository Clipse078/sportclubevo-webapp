import "server-only";

import type { Prisma, TaskContextType, TaskStatus } from "@prisma/client";
import { TaskContextType as TaskContextTypeEnum } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TASK_STATUS_LABELS, TASK_CONTEXT_LABELS } from "@/lib/tasks/management-labels";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";

export type ClubDevelopmentTaskCandidate = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  assigneeLabels: string[];
  initiativeTitle: string | null;
  initiativeSlug: string | null;
  contextLabel: string | null;
};

const CANDIDATE_SELECT = {
  id: true,
  title: true,
  status: true,
  contextType: true,
  contextId: true,
  primaryInitiativeId: true,
  assignees: {
    select: {
      user: { select: { firstName: true, lastName: true } },
    },
    take: 3,
    orderBy: { assignedAt: "asc" as const },
  },
} satisfies Prisma.TaskSelect;

type CandidateRow = Prisma.TaskGetPayload<{ select: typeof CANDIDATE_SELECT }>;

function assigneeLabelsFromRow(row: CandidateRow): string[] {
  return row.assignees
    .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim())
    .filter((label) => label.length > 0);
}

function contextLabel(row: CandidateRow): string | null {
  if (!row.contextType) return null;
  const base = TASK_CONTEXT_LABELS[row.contextType as TaskContextType] ?? row.contextType;
  if (row.contextType === TaskContextTypeEnum.INITIATIVE) {
    return base;
  }
  return base;
}

export async function searchClubDevelopmentTaskCandidates(
  taskCtx: TaskServiceContext,
  options: {
    query?: string;
    limit?: number;
    excludeTaskIds?: readonly string[];
    rootsOnly?: boolean;
  },
): Promise<ClubDevelopmentTaskCandidate[]> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 40);
  const q = (options.query ?? "").trim();
  const exclude = new Set((options.excludeTaskIds ?? []).filter(Boolean));

  const and: Prisma.TaskWhereInput[] = [
    buildTaskReadWhere(taskCtx),
    {
      tenantId: taskCtx.tenantId,
      ...(options.rootsOnly === false ? {} : { parentTaskId: null }),
    },
  ];

  if (q.length >= 2) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    });
  } else if (q.length > 0) {
    return [];
  }

  const rows = await prisma.task.findMany({
    where: { AND: and },
    select: CANDIDATE_SELECT,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    take: limit + exclude.size + 8,
  });

  const filtered = rows.filter((row) => !exclude.has(row.id)).slice(0, limit);

  const initiativeIds = new Set<string>();
  for (const row of filtered) {
    if (row.contextType === TaskContextTypeEnum.INITIATIVE && row.contextId) {
      initiativeIds.add(row.contextId);
    }
    if (row.primaryInitiativeId) initiativeIds.add(row.primaryInitiativeId);
  }

  const initiatives =
    initiativeIds.size > 0
      ? await prisma.initiative.findMany({
          where: { tenantId: taskCtx.tenantId, id: { in: [...initiativeIds] } },
          select: { id: true, title: true, slug: true },
        })
      : [];
  const initiativeById = new Map(initiatives.map((i) => [i.id, i]));

  function resolveInitiative(row: CandidateRow): { title: string | null; slug: string | null } {
    const id =
      row.contextType === TaskContextTypeEnum.INITIATIVE && row.contextId
        ? row.contextId
        : row.primaryInitiativeId;
    if (!id) return { title: null, slug: null };
    const init = initiativeById.get(id);
    return { title: init?.title ?? null, slug: init?.slug ?? null };
  }

  return filtered.map((row) => {
    const initiative = resolveInitiative(row);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      statusLabel: TASK_STATUS_LABELS[row.status],
      assigneeLabels: assigneeLabelsFromRow(row),
      initiativeTitle: initiative.title,
      initiativeSlug: initiative.slug,
      contextLabel: contextLabel(row),
    };
  });
}