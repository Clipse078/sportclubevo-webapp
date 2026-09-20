import { TaskStatus } from "@prisma/client";
import { TaskValidationError } from "./errors";

/** Actionable child statuses that block parent completion. */
export const ACTIONABLE_TASK_STATUSES = [
  TaskStatus.OPEN,
  TaskStatus.IN_PROGRESS,
] as const;

/**
 * CANCELLED subtasks are excluded from progress denominator.
 * DONE counts as completed. OPEN/IN_PROGRESS are outstanding.
 */
export function computeSubtaskProgress(
  children: { status: TaskStatus }[],
): {
  completedCount: number;
  totalCount: number;
  percent: number;
  label: string;
} {
  const relevant = children.filter((c) => c.status !== TaskStatus.CANCELLED);
  const totalCount = relevant.length;
  const completedCount = relevant.filter((c) => c.status === TaskStatus.DONE).length;
  const percent = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);
  return {
    completedCount,
    totalCount,
    percent,
    label: `${completedCount} / ${totalCount} erledigt`,
  };
}

export function hasActionableSubtasks(
  children: { status: TaskStatus }[],
): boolean {
  return children.some((c) => ACTIONABLE_TASK_STATUSES.includes(c.status as (typeof ACTIONABLE_TASK_STATUSES)[number]));
}

export function assertNotSubtaskParent(parent: { parentTaskId: string | null }): void {
  if (parent.parentTaskId) {
    throw new TaskValidationError(
      "Subtasks cannot contain further subtasks (max depth = 1)",
    );
  }
}
