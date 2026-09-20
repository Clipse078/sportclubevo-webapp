import type { TaskPriority, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "./management-labels";

export function taskStatusPresentation(status: TaskStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "OPEN":
      return {
        label: TASK_STATUS_LABELS.OPEN,
        className: "border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--text-2)]",
      };
    case "IN_PROGRESS":
      return {
        label: TASK_STATUS_LABELS.IN_PROGRESS,
        className: "border-sky-500/30 bg-sky-950/30 text-sky-300",
      };
    case "DONE":
      return {
        label: TASK_STATUS_LABELS.DONE,
        className: "border-emerald-500/30 bg-emerald-950/30 text-emerald-300",
      };
    case "CANCELLED":
      return {
        label: TASK_STATUS_LABELS.CANCELLED,
        className: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
      };
    default:
      return { label: status, className: "border-[var(--border)]" };
  }
}

export function taskPriorityPresentation(priority: TaskPriority): {
  label: string;
  className: string;
  visible: boolean;
} {
  if (priority === "NORMAL") {
    return {
      label: TASK_PRIORITY_LABELS.NORMAL,
      className: "text-[var(--muted)]",
      visible: false,
    };
  }
  if (priority === "LOW") {
    return {
      label: TASK_PRIORITY_LABELS.LOW,
      className: "text-[var(--muted)]",
      visible: true,
    };
  }
  if (priority === "HIGH") {
    return {
      label: TASK_PRIORITY_LABELS.HIGH,
      className: "font-medium text-amber-400",
      visible: true,
    };
  }
  return {
    label: TASK_PRIORITY_LABELS.URGENT,
    className: "font-semibold text-orange-400",
    visible: true,
  };
}

export function taskStatusBadgeClass(status: TaskStatus): string {
  return cn(
    "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold leading-none",
    taskStatusPresentation(status).className,
  );
}
