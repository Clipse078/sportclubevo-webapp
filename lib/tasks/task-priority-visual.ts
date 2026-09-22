import type { TaskPriority } from "@prisma/client";
import { TASK_PRIORITY_LABELS } from "./management-labels";

export type TaskPriorityVisual = {
  priority: TaskPriority;
  label: string;
  iconKey: "down" | "right" | "up" | "up-double";
  className: string;
  emphasis: boolean;
};

const PRIORITY_VISUALS: Record<TaskPriority, Omit<TaskPriorityVisual, "priority" | "label">> = {
  LOW: {
    iconKey: "down",
    className: "text-sky-400/90",
    emphasis: true,
  },
  NORMAL: {
    iconKey: "right",
    className: "text-[var(--text-2)]",
    emphasis: true,
  },
  HIGH: {
    iconKey: "up",
    className: "text-amber-400",
    emphasis: true,
  },
  URGENT: {
    iconKey: "up-double",
    className: "text-red-400",
    emphasis: true,
  },
};

export function taskPriorityVisual(priority: TaskPriority): TaskPriorityVisual {
  return {
    priority,
    label: TASK_PRIORITY_LABELS[priority],
    ...PRIORITY_VISUALS[priority],
  };
}
