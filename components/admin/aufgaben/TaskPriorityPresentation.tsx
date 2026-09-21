"use client";

import type { TaskPriority } from "@prisma/client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronsUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { taskPriorityVisual as resolveTaskPriorityVisual } from "@/lib/tasks/task-priority-visual";

const ICON_BY_KEY = {
  down: ArrowDown,
  right: ArrowRight,
  up: ArrowUp,
  "up-double": ChevronsUp,
} satisfies Record<string, LucideIcon>;

export function taskPriorityVisual(priority: TaskPriority) {
  const visual = resolveTaskPriorityVisual(priority);
  return {
    ...visual,
    Icon: ICON_BY_KEY[visual.iconKey],
  };
}

export function TaskPriorityIconLabel({
  priority,
  className,
  iconClassName,
  showLabel = true,
}: {
  priority: TaskPriority;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}) {
  const visual = taskPriorityVisual(priority);
  const Icon = visual.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} data-priority={priority}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", visual.className, iconClassName)} aria-hidden />
      {showLabel ? <span className={cn("text-sm", visual.className)}>{visual.label}</span> : null}
    </span>
  );
}

export function TaskPrioritySelect({
  name,
  defaultValue = "NORMAL",
  disabled,
  className = "fca-input w-full text-sm",
  testId,
}: {
  name: string;
  defaultValue?: TaskPriority;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[];
  return (
    <div className="relative" data-testid={testId}>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className={cn(className, "appearance-none pr-8")}
      >
        {priorities.map((p) => (
          <option key={p} value={p}>
            {TASK_PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <TaskPriorityIconLabel priority={defaultValue} showLabel={false} />
      </div>
    </div>
  );
}
