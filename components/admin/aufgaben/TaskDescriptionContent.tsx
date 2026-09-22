"use client";

import { taskDescriptionToSafeHtml, storedTaskDescriptionIsEmpty } from "@/lib/tasks/task-description";
import { SCE_TASK_RICH_CONTENT_CLASS } from "@/lib/tasks/task-description-rich-content";

type Props = {
  description: string | null | undefined;
  className?: string;
  "data-testid"?: string;
};

/**
 * Safe read-only Task description (plain text + rich JSON stored in Task.description).
 */
export default function TaskDescriptionContent({
  description,
  className = "text-sm text-[var(--text-2)]",
  "data-testid": testId = "task-description-content",
}: Props) {
  if (storedTaskDescriptionIsEmpty(description)) return null;
  const html = taskDescriptionToSafeHtml(description);
  return (
    <div
      className={`task-description-content ${SCE_TASK_RICH_CONTENT_CLASS} max-w-none ${className}`}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
