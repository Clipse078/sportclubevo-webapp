"use client";

/**
 * SCE-ANLIEGEN-02 — Safe plain-text Meldung message body with @mention highlighting.
 */

import { useMemo } from "react";

export type ClubMeldungMessageMentionView = {
  userId: string;
  displayName: string;
};

type Segment = { type: "text" | "mention"; value: string };

function buildSegments(body: string, mentions: ClubMeldungMessageMentionView[]): Segment[] {
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

export function ClubMeldungMessageBody({
  body,
  mentions = [],
}: {
  body: string;
  mentions?: ClubMeldungMessageMentionView[];
}) {
  const segments = useMemo(() => buildSegments(body, mentions), [body, mentions]);

  return (
    <p className="mt-1 whitespace-pre-wrap break-words text-[var(--foreground)]">
      {segments.map((segment, index) => {
        if (segment.type === "mention") {
          return (
            <span
              key={`mention-${index}`}
              className="font-medium text-[var(--primary)]"
              data-testid="meldung-message-mention"
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