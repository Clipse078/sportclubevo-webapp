"use client";

import { taskDescriptionToSafeHtml, storedTaskDescriptionIsEmpty } from "@/lib/tasks/task-description";

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
      className={`task-description-content prose prose-sm max-w-none ${className}`}
      data-testid={testId}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
