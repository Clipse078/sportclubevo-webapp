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
        className: "border-sky-500/30 bg-sky-950/25 text-sky-300",
        icon: CircleDashed,
        iconClassName: "text-sky-400",
      };
    case "IN_PROGRESS":
      return {
        label: TASK_STATUS_LABELS.IN_PROGRESS,
        className: "border-amber-500/30 bg-amber-950/25 text-amber-200",
        icon: LoaderCircle,
        iconClassName: "text-amber-400",
      };
    case "DONE":
      return {
        label: TASK_STATUS_LABELS.DONE,
        className: "border-emerald-500/30 bg-emerald-950/30 text-emerald-300",
        icon: Check,
        iconClassName: "text-emerald-400",
      };
    case "CANCELLED":
      return {
        label: TASK_STATUS_LABELS.CANCELLED,
        className: "border-red-500/30 bg-red-950/20 text-red-300",
        icon: Ban,
        iconClassName: "text-red-400",
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
