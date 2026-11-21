import type { TaskPriority, TaskStatus } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { Ban, Check, Circle, CircleDashed, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { taskPriorityVisual } from "./task-priority-visual";
import { TASK_STATUS_LABELS } from "./management-labels";

export type TaskStatusPresentation = {
  label: string;
  className: string;
  icon: LucideIcon;
  iconClassName: string;
};

export function taskStatusPresentation(status: TaskStatus): TaskStatusPresentation {
  switch (status) {
    case "OPEN":
      return {
        label: TASK_STATUS_LABELS.OPEN,
        className:
          "border-[var(--sce-info-border)] bg-[var(--sce-info-light)] text-[var(--sce-color-status-info)]",
        icon: CircleDashed,
        iconClassName: "text-[var(--sce-color-status-info)]",
      };
    case "IN_PROGRESS":
      return {
        label: TASK_STATUS_LABELS.IN_PROGRESS,
        className:
          "border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] text-[var(--sce-color-status-warning)]",
        icon: LoaderCircle,
        iconClassName: "text-[var(--sce-color-status-warning)]",
      };
    case "WAITING":
      return {
        label: TASK_STATUS_LABELS.WAITING,
        className:
          "border-[var(--sce-border)] bg-[var(--surface-2)] text-[var(--text-2)]",
        icon: CircleDashed,
        iconClassName: "text-[var(--muted)]",
      };
    case "DONE":
      return {
        label: TASK_STATUS_LABELS.DONE,
        className:
          "border-[var(--sce-success-border)] bg-[var(--sce-success-light)] text-[var(--sce-color-status-success)]",
        icon: Check,
        iconClassName: "text-[var(--sce-color-status-success)]",
      };
    case "CANCELLED":
      return {
        label: TASK_STATUS_LABELS.CANCELLED,
        className:
          "border-[var(--sce-danger-border)] bg-[var(--sce-danger-light)] text-[var(--sce-color-status-error)]",
        icon: Ban,
        iconClassName: "text-[var(--sce-color-status-error)]",
      };
    default:
      return {
        label: status,
        className: "border-[var(--border)]",
        icon: Circle,
        iconClassName: "text-[var(--muted)]",
      };
  }
}

export function taskPriorityPresentation(priority: TaskPriority): {
  label: string;
  className: string;
  visible: boolean;
} {
  const visual = taskPriorityVisual(priority);
  return {
    label: visual.label,
    className: cn(visual.emphasis && priority !== "NORMAL" ? "font-medium" : "", visual.className),
    visible: visual.emphasis,
  };
}

export function taskStatusBadgeClass(status: TaskStatus): string {
  return cn(
    "inline-flex items-center rounded-md border px-2 py-0.5 text-[0.6875rem] font-semibold leading-none",
    taskStatusPresentation(status).className,
  );
}
