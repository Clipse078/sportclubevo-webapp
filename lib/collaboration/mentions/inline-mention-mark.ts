/**
 * Shared TipTap @mention mark for inline rich text (Aufgaben, Dokumentation, Aktivität).
 * Stored JSON mark name remains `taskDescriptionMention` for backward compatibility.
 */

export {
  TaskDescriptionMentionMark as SceInlineMentionMark,
  TaskDescriptionMentionMark,
} from "@/components/admin/aufgaben/TaskDescriptionMentionMark";

export const SCE_INLINE_MENTION_MARK_NAME = "taskDescriptionMention" as const;