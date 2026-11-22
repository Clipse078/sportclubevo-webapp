import { describe, expect, it } from "vitest";

import {
  diffNewMentionUserIds,
  extractMentionUserIdsFromTipTapJson,
} from "@/lib/collaboration/mentions/extract-mention-user-ids";

const docWithMention = (userId: string, label: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `@${label}`,
          marks: [
            {
              type: "taskDescriptionMention",
              attrs: { userId, label },
            },
          ],
        },
      ],
    },
  ],
});

describe("extractMentionUserIdsFromTipTapJson", () => {
  it("extracts stable user IDs", () => {
    const ids = extractMentionUserIdsFromTipTapJson(docWithMention("user-a", "Lara Keller"));
    expect(ids).toEqual(["user-a"]);
  });

  it("deduplicates new mentions vs previous published", () => {
    const prev = docWithMention("user-a", "A");
    const next = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "@A",
              marks: [{ type: "taskDescriptionMention", attrs: { userId: "user-a", label: "A" } }],
            },
            { type: "text", text: " " },
            {
              type: "text",
              text: "@B",
              marks: [{ type: "taskDescriptionMention", attrs: { userId: "user-b", label: "B" } }],
            },
          ],
        },
      ],
    };
    expect(diffNewMentionUserIds(prev, next)).toEqual(["user-b"]);
  });

  it("suppresses carried-forward mentions on republication", () => {
    const body = docWithMention("user-a", "A");
    expect(diffNewMentionUserIds(body, body)).toEqual([]);
  });
});