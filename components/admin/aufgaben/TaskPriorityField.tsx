"use client";

import { useState } from "react";
import type { TaskPriority } from "@prisma/client";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { TaskPriorityIconLabel } from "./TaskPriorityPresentation";

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[];

type Props = {
  name?: string;
  defaultValue?: TaskPriority;
  value?: TaskPriority;
  onValueChange?: (priority: TaskPriority) => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
  omitName?: boolean;
};

export default function TaskPriorityField({
  name = "priority",
  defaultValue = "NORMAL",
  value: controlledValue,
  onValueChange,
  disabled,
  className = "fca-input w-full text-sm",
  testId,
  omitName = false,
}: Props) {
  const [internalValue, setInternalValue] = useState<TaskPriority>(defaultValue);
  const value = controlledValue ?? internalValue;

  function handleChange(next: TaskPriority) {
    if (controlledValue === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  }

  return (
    <div className="flex items-center gap-2" data-testid={testId}>
      <TaskPriorityIconLabel priority={value} />
      <select
        {...(omitName ? {} : { name })}
        value={value}
        disabled={disabled}
        className={className}
        onChange={(e) => handleChange(e.target.value as TaskPriority)}
        aria-label="Priorität"
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
