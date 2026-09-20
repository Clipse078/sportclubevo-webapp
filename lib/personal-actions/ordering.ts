import {
  comparePersonalTasks,
  getPersonalTaskUrgencyBucket,
} from "@/lib/tasks/personal-ordering";
import type { PersonalAction } from "./types";

function getNoDeadlineBucket(action: PersonalAction, now: Date): number {
  if (action.dueAt) {
    return getPersonalTaskUrgencyBucket(
      {
        id: action.id,
        dueAt: action.dueAt,
        status: "OPEN",
        createdAt: action.createdAt ?? new Date(0).toISOString(),
        priority: action.priority ?? "NORMAL",
      },
      now,
    );
  }
  return 5;
}

function eventStartMs(action: PersonalAction): number | null {
  const iso = action.context?.eventStartAt;
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function comparePersonalActions(a: PersonalAction, b: PersonalAction, now: Date = new Date()): number {
  const bucketA = getNoDeadlineBucket(a, now);
  const bucketB = getNoDeadlineBucket(b, now);
  if (bucketA !== bucketB) return bucketA - bucketB;

  if (a.dueAt && b.dueAt) {
    const taskCmp = comparePersonalTasks(
      {
        id: a.id,
        dueAt: a.dueAt,
        status: "OPEN",
        createdAt: a.createdAt ?? new Date(0).toISOString(),
        priority: a.priority ?? "NORMAL",
      },
      {
        id: b.id,
        dueAt: b.dueAt,
        status: "OPEN",
        createdAt: b.createdAt ?? new Date(0).toISOString(),
        priority: b.priority ?? "NORMAL",
      },
      now,
    );
    if (taskCmp !== 0) return taskCmp;
  } else if (a.dueAt && !b.dueAt) {
    return -1;
  } else if (!a.dueAt && b.dueAt) {
    return 1;
  }

  const startA = eventStartMs(a);
  const startB = eventStartMs(b);
  if (startA != null && startB != null && startA !== startB) {
    return startA - startB;
  }
  if (startA != null && startB == null) return -1;
  if (startA == null && startB != null) return 1;

  return a.id.localeCompare(b.id);
}

export function sortPersonalActions(actions: PersonalAction[], now: Date = new Date()): PersonalAction[] {
  return [...actions].sort((a, b) => comparePersonalActions(a, b, now));
}

export function dedupePersonalActionsById(actions: PersonalAction[]): PersonalAction[] {
  const byId = new Map<string, PersonalAction>();
  for (const action of actions) {
    if (!byId.has(action.id)) {
      byId.set(action.id, action);
    }
  }
  return [...byId.values()];
}
