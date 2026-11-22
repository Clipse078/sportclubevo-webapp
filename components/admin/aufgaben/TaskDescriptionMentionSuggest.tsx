"use client";

import type { Editor } from "@tiptap/react";
import { useCallback } from "react";

import {
  SceInlineMentionSuggest,
  type SceMentionCandidate,
} from "@/components/admin/shared/mentions/SceInlineMentionSuggest";
import {
  searchTaskMentionCandidatesAction,
  searchTenantDescriptionMentionCandidatesAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type MentionScope = "tenant" | "task";

type Props = {
  editor: Editor | null;
  scope: MentionScope;
  taskId?: string | null;
};

export default function TaskDescriptionMentionSuggest({
  editor,
  scope,
  taskId = null,
}: Props) {
  const searchCandidates = useCallback(
    async (query: string): Promise<SceMentionCandidate[]> => {
      const result =
        scope === "task" && taskId?.trim()
          ? await searchTaskMentionCandidatesAction(taskId.trim(), query)
          : await searchTenantDescriptionMentionCandidatesAction(query);
      if (!result.ok) return [];
      return result.options.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        firstName: row.firstName,
        lastName: row.lastName,
      }));
    },
    [scope, taskId],
  );

  return (
    <SceInlineMentionSuggest
      editor={editor}
      searchCandidates={searchCandidates}
      testId="task-description-mention-suggest"
    />
  );
}