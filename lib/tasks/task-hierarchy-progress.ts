import { TaskStatus } from "@prisma/client";
import type { TaskProgressDto } from "./types";
import {
  computeSubtaskProgress,
  hasActionableSubtasks,
} from "./subtask-rules";

/** Subtasks cancelled are excluded from parent and initiative progress denominators. */
export function isProgressEligibleStatus(status: TaskStatus): boolean {
  return status !== TaskStatus.CANCELLED;
}

export type TaskProgressUnit = {
  id: string;
  status: TaskStatus;
  parentTaskId: string | null;
};

/**
 * Initiative and rollup consumers: expand parent tasks into eligible direct subtasks;
 * standalone roots without eligible children count as one unit.
 */
export function collectEligibleProgressLeafUnits(
  tasks: readonly TaskProgressUnit[],
): { id: string; status: TaskStatus }[] {
  const byParent = new Map<string, TaskProgressUnit[]>();
  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const list = byParent.get(task.parentTaskId) ?? [];
    list.push(task);
    byParent.set(task.parentTaskId, list);
  }

  const units: { id: string; status: TaskStatus }[] = [];
  const seen = new Set<string>();

  for (const task of tasks) {
    if (task.parentTaskId) continue;

    const children = byParent.get(task.id) ?? [];
    const eligibleChildren = children.filter((c) => isProgressEligibleStatus(c.status));

    if (eligibleChildren.length > 0) {
      for (const child of eligibleChildren) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        units.push({ id: child.id, status: child.status });
      }
      continue;
    }

    if (!isProgressEligibleStatus(task.status)) continue;
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    units.push({ id: task.id, status: task.status });
  }

  return units;
}

export function computeInitiativeProgressFromUnits(
  units: readonly { status: TaskStatus }[],
): Pick<TaskProgressDto, "completedCount" | "totalCount" | "percent"> {
  const eligible = units.filter((u) => isProgressEligibleStatus(u.status));
  const totalCount = eligible.length;
  const completedCount = eligible.filter((u) => u.status === TaskStatus.DONE).length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}

export function computeParentTaskProgress(input: {
  parentStatus: TaskStatus;
  subtasks: { status: TaskStatus }[];
}): TaskProgressDto & { hasSubtasks: boolean } {
  const eligibleSubtasks = input.subtasks.filter((s) => isProgressEligibleStatus(s.status));

  if (eligibleSubtasks.length === 0) {
    const percent = input.parentStatus === TaskStatus.DONE ? 100 : 0;
    const completedCount = input.parentStatus === TaskStatus.DONE ? 1 : 0;
    return {
      hasSubtasks: false,
      completedCount,
      totalCount: eligibleSubtasks.length,
      percent,
      label:
        input.parentStatus === TaskStatus.DONE ? "1 / 1 erledigt" : "0 / 1 erledigt",
    };
  }

  const rolled = computeSubtaskProgress(eligibleSubtasks);
  return {
    hasSubtasks: true,
    completedCount: rolled.completedCount,
    totalCount: rolled.totalCount,
    percent: rolled.percent,
    label: rolled.label,
  };
}

/**
 * When a parent has eligible subtasks, surface completion derived from children
 * instead of a stored DONE that contradicts open Teilaufgaben.
 */
export function deriveEffectiveParentStatus(
  storedStatus: TaskStatus,
  subtasks: { status: TaskStatus }[],
): TaskStatus {
  const eligible = subtasks.filter((s) => isProgressEligibleStatus(s.status));
  if (eligible.length === 0) {
    return storedStatus;
  }

  if (hasActionableSubtasks(eligible)) {
    if (storedStatus === TaskStatus.DONE) {
      return TaskStatus.OPEN;
    }
    return storedStatus;
  }

  if (eligible.every((s) => s.status === TaskStatus.DONE)) {
    return TaskStatus.DONE;
  }

  return storedStatus;
}

export function countOpenEligibleSubtasks(subtasks: { status: TaskStatus }[]): number {
  return subtasks.filter(
    (s) =>
      isProgressEligibleStatus(s.status) &&
      (s.status === TaskStatus.OPEN || s.status === TaskStatus.IN_PROGRESS),
  ).length;
}

export function nextRelevantSubtaskDeadline(
  subtasks: { status: TaskStatus; dueAt: string | null }[],
): string | null {
  const open = subtasks.filter(
    (s) =>
      isProgressEligibleStatus(s.status) &&
      (s.status === TaskStatus.OPEN || s.status === TaskStatus.IN_PROGRESS) &&
      s.dueAt,
  );
  if (open.length === 0) return null;
  const sorted = [...open].sort((a, b) => {
    const at = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
    const bt = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
    return at - bt;
  });
  return sorted[0]?.dueAt ?? null;
}
