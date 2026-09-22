"use client";

import type { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { taskStatusPresentation } from "@/lib/tasks/management-presentation";

type Props = {
  status: TaskStatus;
  className?: string;
  iconClassName?: string;
};

export default function TaskStatusLabel({ status, className, iconClassName }: Props) {
  const presentation = taskStatusPresentation(status);
  const Icon = presentation.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", presentation.iconClassName, iconClassName)}
        aria-hidden="true"
      />
      <span>{presentation.label}</span>
    </span>
  );
}
