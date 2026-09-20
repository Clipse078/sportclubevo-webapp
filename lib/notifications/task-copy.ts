import { formatDueDateLabel } from "@/lib/tasks/management-deadline";

export function formatTaskDueLabel(
  dueAt: Date | null | undefined,
  locale: string,
  timeZone: string,
): string | null {
  if (!dueAt) return null;
  return formatDueDateLabel(dueAt, locale, timeZone);
}

export function buildTaskAssignedCopy(taskTitle: string, isSubtask: boolean): {
  title: string;
  body: string;
} {
  if (isSubtask) {
    return {
      title: "Neue Unteraufgabe",
      body: `"${taskTitle}"\nDir wurde diese Unteraufgabe zugewiesen.`,
    };
  }
  return {
    title: "Neue Aufgabe",
    body: `"${taskTitle}"\nDir wurde diese Aufgabe zugewiesen.`,
  };
}

export function buildTaskDueSoonCopy(taskTitle: string, dueLabel: string): {
  title: string;
  body: string;
} {
  return {
    title: "Aufgabe bald fällig",
    body: `"${taskTitle}"\nFällig: ${dueLabel}`,
  };
}

export function buildTaskOverdueCopy(taskTitle: string, dueLabel: string): {
  title: string;
  body: string;
} {
  return {
    title: "Aufgabe überfällig",
    body: `"${taskTitle}"\nFällig: ${dueLabel}`,
  };
}

export function buildTaskDeadlineChangedCopy(
  taskTitle: string,
  dueLabel: string | null,
): { title: string; body: string } {
  if (!dueLabel) {
    return {
      title: "Frist entfernt",
      body: `"${taskTitle}"\nDie Frist wurde entfernt.`,
    };
  }
  return {
    title: "Frist geändert",
    body: `"${taskTitle}"\nNeue Frist: ${dueLabel}`,
  };
}
