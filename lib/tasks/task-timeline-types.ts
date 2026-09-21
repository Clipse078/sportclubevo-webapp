/**
 * AUFGABEN-06A — Safe task activity timeline DTOs.
 */

export type TaskTimelineActorDto = {
  userId: string | null;
  displayName: string;
};

export type TaskTimelineEntryKind = "AUDIT" | "COMMENT";

export type TaskTimelineMentionDto = {
  userId: string;
  displayName: string;
};

export type TaskTimelineEntryDto = {
  id: string;
  kind: TaskTimelineEntryKind;
  occurredAt: string;
  actor: TaskTimelineActorDto;
  title: string | null;
  body: string | null;
  mentions: TaskTimelineMentionDto[];
  commentAnchorId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  details: string[];
};

export type TaskTimelineCursor = {
  occurredAt: string;
  source: "AUDIT" | "COMMENT";
  id: string;
};

export type TaskTimelinePageDto = {
  entries: TaskTimelineEntryDto[];
  nextCursor: string | null;
  hasMore: boolean;
};
