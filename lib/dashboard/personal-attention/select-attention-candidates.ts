import { TaskStatus } from "@prisma/client";
import { getPersonalTaskUrgencyBucket } from "@/lib/tasks/personal-ordering";
import type { PersonalAction } from "@/lib/personal-actions/types";

/**
 * Attention = urgent / obligation signals (not the full open-task backlog).
 *
 * - Tasks: overdue or due today (bucket 0–1).
 * - Participation & requirements: canonical personal obligations (always actionable).
 */
export function isPersonalAttentionCandidate(
  action: PersonalAction,
  now: Date = new Date(),
): boolean {
  if (action.sourceType === "ATTENDANCE_RESPONSE" || action.sourceType === "REQUIREMENT") {
    return true;
  }

  if (action.sourceType === "TASK") {
    const bucket = getPersonalTaskUrgencyBucket(
      {
        id: action.id,
        dueAt: action.dueAt,
        status: TaskStatus.OPEN,
        createdAt: action.createdAt ?? new Date(0).toISOString(),
        priority: action.priority ?? "NORMAL",
      },
      now,
    );
    return bucket <= 1;
  }

  return false;
}

export function selectPersonalAttentionCandidates(
  actions: PersonalAction[],
  now: Date = new Date(),
): PersonalAction[] {
  return actions.filter((action) => isPersonalAttentionCandidate(action, now));
}

/** Task ids surfaced in attention — omit from Meine Aufgaben preview to avoid duplicate rows. */
export function collectAttentionTaskIds(actions: PersonalAction[]): Set<string> {
  const ids = new Set<string>();
  for (const action of actions) {
    if (action.sourceType === "TASK") {
      ids.add(action.id);
    }
  }
  return ids;
}
