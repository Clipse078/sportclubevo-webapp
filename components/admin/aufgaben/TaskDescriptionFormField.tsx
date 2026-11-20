"use client";

import { useEffect, useMemo, useState } from "react";
import TaskDescriptionEditor from "./TaskDescriptionEditor";
import {
  documentFromStoredTaskDescription,
  serializeTaskDescriptionForStorage,
  type TaskDescriptionDocument,
} from "@/lib/tasks/task-description";

type Props = {
  name?: string;
  initialStored?: string | null;
  label?: string;
  optional?: boolean;
  disabled?: boolean;
  inputId?: string;
  compact?: boolean;
  /** Sync serialized storage value to parent forms that submit via client state. */
  onSerializedChange?: (serialized: string) => void;
};

export default function TaskDescriptionFormField({
  name = "description",
  initialStored = null,
  label = "Beschreibung",
  optional = false,
  disabled = false,
  inputId = "task-description",
  compact = false,
  onSerializedChange,
}: Props) {
  const [document, setDocument] = useState<TaskDescriptionDocument>(() =>
    documentFromStoredTaskDescription(initialStored),
  );

  const serialized = useMemo(
    () => serializeTaskDescriptionForStorage(document) ?? "",
    [document],
  );

  useEffect(() => {
    onSerializedChange?.(serialized);
  }, [onSerializedChange, serialized]);

  return (
    <div className="block space-y-1">
      <span className="text-xs font-medium text-[var(--text-2)]">
        {label}
        {optional ? " (optional)" : ""}
      </span>
      <TaskDescriptionEditor
        value={document}
        onChange={setDocument}
        disabled={disabled}
        inputId={inputId}
        minHeightClassName={compact ? "min-h-[7rem]" : "min-h-[12.5rem]"}
      />
      <input type="hidden" name={name} value={serialized} data-testid="task-description-serialized" />
    </div>
  );
}
