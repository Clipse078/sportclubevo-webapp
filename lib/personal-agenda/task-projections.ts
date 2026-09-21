import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isActiveTaskStatus } from "@/lib/tasks/management-deadline";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import {
  buildTaskProjectionId,
  type PersonalCalendarItem,
} from "./types";

const ACTIONABLE_STATUSES = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] as const;

export type LoadTaskDeadlineProjectionsArgs = {
  tenantId: string;
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  /** When false, no task rows are loaded (e.g. missing tasks.view). */
  tasksViewAuthorized: boolean;
};

/**
 * Personal assignee-scoped task deadline projections only.
 * Never uses tasks.view_all / tasks.manage broad visibility.
 */
export async function loadTaskDeadlineProjections(
  args: LoadTaskDeadlineProjectionsArgs,
): Promise<PersonalCalendarItem[]> {
  if (!args.tasksViewAuthorized) {
    return [];
  }

  const rows = await prisma.task.findMany({
    where: {
      tenantId: args.tenantId,
      dueAt: { not: null, gte: args.rangeStart, lte: args.rangeEnd },
      status: { in: [...ACTIONABLE_STATUSES] },
      assignees: { some: { userId: args.userId, tenantId: args.tenantId } },
    },
    orderBy: [{ dueAt: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
    },
  });

  return rows
    .filter((row) => row.dueAt && isActiveTaskStatus(row.status))
    .map((row) => {
      const dueAt = row.dueAt!;
      const href = taskWorkspaceHref(row.id);
      return {
        id: buildTaskProjectionId(row.id),
        sourceType: "TASK" as const,
        title: row.title,
        startAt: dueAt,
        endAt: null,
        allDay: true,
        href,
        typeLabel: "Aufgabe",
        taskStatus: row.status,
        ariaLabel: `Aufgabe: ${row.title}`,
      };
    });
}
