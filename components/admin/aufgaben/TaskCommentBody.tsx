"use client";

/**
 * AUFGABEN-06B — Safe plain-text task comment body with @mention highlighting.
 */

import { useMemo } from "react";
import type { TaskTimelineMentionDto } from "@/lib/tasks/task-timeline-types";

type Segment = { type: "text" | "mention"; value: string };

function buildSegments(body: string, mentions: TaskTimelineMentionDto[]): Segment[] {
  if (!body) return [];
  if (mentions.length === 0) return [{ type: "text", value: body }];

  const tokens = mentions
    .map((mention) => ({
      mention,
      token: `@${mention.displayName}`,
      index: body.indexOf(`@${mention.displayName}`),
    }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);

  if (tokens.length === 0) return [{ type: "text", value: body }];

  const segments: Segment[] = [];
  let cursor = 0;

  for (const item of tokens) {
    if (item.index > cursor) {
      segments.push({ type: "text", value: body.slice(cursor, item.index) });
    }
    segments.push({ type: "mention", value: item.mention.displayName });
    cursor = item.index + item.token.length;
  }

  if (cursor < body.length) {
    segments.push({ type: "text", value: body.slice(cursor) });
  }

  return segments;
}

export function TaskCommentBody({
  body,
  mentions,
}: {
  body: string;
  mentions: TaskTimelineMentionDto[];
}) {
  const segments = useMemo(() => buildSegments(body, mentions), [body, mentions]);

  return (
    <p className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "mention") {
          return (
            <span
              key={`mention-${index}`}
              className="font-medium text-[var(--primary)]"
              data-testid="task-comment-mention"
            >
              @{segment.value}
            </span>
          );
        }
        return <span key={`text-${index}`}>{segment.value}</span>;
      })}
    </p>
  );
}
