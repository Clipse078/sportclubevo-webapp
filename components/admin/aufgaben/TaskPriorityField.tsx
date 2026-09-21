"use client";

import { useState } from "react";
import type { TaskPriority } from "@prisma/client";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { TaskPriorityIconLabel } from "./TaskPriorityPresentation";

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[];

type Props = {
  name?: string;
  defaultValue?: TaskPriority;
  disabled?: boolean;
  className?: string;
  testId?: string;
};

export default function TaskPriorityField({
  name = "priority",
  defaultValue = "NORMAL",
  disabled,
  className = "fca-input w-full text-sm",
  testId,
}: Props) {
  const [value, setValue] = useState<TaskPriority>(defaultValue);

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <TaskPriorityIconLabel priority={value} />
      <select
        name={name}
        value={value}
        disabled={disabled}
        className={className}
        onChange={(e) => setValue(e.target.value as TaskPriority)}
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {TASK_PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
    </div>
  );
}
