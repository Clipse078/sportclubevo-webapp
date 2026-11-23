"use client";

/**
 * Reusable Task description rich-text editor (TipTap). AUFGABEN-06F2-UX1.
 * Mounts the shared `SceWritingEngine` (`profile="task"`).
 */

import type { Editor } from "@tiptap/react";
import { useState } from "react";

import TaskDescriptionMentionSuggest from "./TaskDescriptionMentionSuggest";
import { SceWritingEngine } from "@/components/sce-writing/SceWritingEngine";
import { SCE_TASK_RICH_CONTENT_CLASS } from "@/lib/tasks/task-description-rich-content";
import type { TaskDescriptionDocument } from "@/lib/tasks/task-description";
import { emptyTaskDescriptionDocument } from "@/lib/tasks/task-description";

export { isAllowedEditorLinkHref } from "@/lib/sce-writing/sce-writing-link";

type Props = {
  value: TaskDescriptionDocument;
  onChange: (value: TaskDescriptionDocument) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeightClassName?: string;
  "data-testid"?: string;
  inputId?: string;
  enableMentions?: boolean;
  mentionScope?: "tenant" | "task";
  mentionTaskId?: string | null;
};

export default function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Aufgabe beschreiben …",
  disabled = false,
  minHeightClassName = "min-h-[12.5rem]",
  "data-testid": testId = "task-description-editor",
  inputId,
  enableMentions = false,
  mentionScope = "tenant",
  mentionTaskId = null,
}: Props) {
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  return (
    <SceWritingEngine
      profile="task"
      value={value ?? emptyTaskDescriptionDocument()}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      minHeightClassName={minHeightClassName}
      prosemirrorClassName={`${SCE_TASK_RICH_CONTENT_CLASS} ${minHeightClassName} outline-none`}
      editorContentClassName={`task-description-editor ${SCE_TASK_RICH_CONTENT_CLASS} px-3 py-2`}
      data-testid={testId}
      inputId={inputId}
      enableMentions={enableMentions}
      onEditorReady={setEditorInstance}
      mentionOverlay={
        enableMentions && editorInstance && !disabled ? (
          <TaskDescriptionMentionSuggest
            editor={editorInstance}
            scope={mentionScope}
            taskId={mentionTaskId}
          />
        ) : null
      }
    />
  );
}