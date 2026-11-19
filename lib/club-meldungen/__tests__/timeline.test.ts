import { describe, expect, it } from "vitest";
import { buildClubMeldungHandlerTimeline } from "@/lib/club-meldungen/timeline";

describe("buildClubMeldungHandlerTimeline", () => {
  it("merges message audit rows by messageId, not timestamp alone", () => {
    const messages = [
      {
        id: "msg-1",
        body: "Antworttext",
        audience: "REPORTER_REPLY" as const,
        createdAt: "2026-01-02T10:00:00.000Z",
        author: { firstName: "Alex", lastName: "Handler" },
      },
      {
        id: "msg-2",
        body: "Intern",
        audience: "INTERNAL_NOTE" as const,
        createdAt: "2026-01-02T10:05:00.000Z",
        author: { firstName: "Alex", lastName: "Handler" },
      },
    ];

    const history = [
      {
        id: "hist-status",
        eventType: "STATUS_CHANGED" as const,
        createdAt: "2026-01-02T09:00:00.000Z",
        actor: { firstName: "Alex", lastName: "Handler" },
        payloadJson: { to: "IN_PROGRESS" },
      },
      {
        id: "hist-reply",
        eventType: "HANDLER_MESSAGE_TO_REPORTER" as const,
        createdAt: "2026-01-02T10:00:01.000Z",
        actor: { firstName: "Alex", lastName: "Handler" },
        payloadJson: { messageId: "msg-1", audience: "REPORTER_REPLY" },
      },
      {
        id: "hist-note",
        eventType: "FIELD_UPDATED" as const,
        createdAt: "2026-01-02T10:05:01.000Z",
        actor: { firstName: "Alex", lastName: "Handler" },
        payloadJson: { messageId: "msg-2", audience: "INTERNAL_NOTE" },
      },
    ];

    const timeline = buildClubMeldungHandlerTimeline(messages, history);
    expect(timeline.filter((entry) => entry.kind === "history")).toHaveLength(1);
    expect(timeline.filter((entry) => entry.kind === "message")).toHaveLength(2);

    const publicReply = timeline.find(
      (entry) => entry.kind === "message" && entry.message.id === "msg-1",
    );
    expect(publicReply?.kind === "message" && publicReply.linkedHistoryId).toBe("hist-reply");

    const internal = timeline.find(
      (entry) => entry.kind === "message" && entry.message.id === "msg-2",
    );
    expect(internal?.kind === "message" && internal.linkedHistoryId).toBe("hist-note");
  });

  it("keeps unrelated history events at the same timestamp", () => {
    const at = "2026-01-02T10:00:00.000Z";
    const timeline = buildClubMeldungHandlerTimeline(
      [
        {
          id: "msg-1",
          body: "Hallo",
          audience: "REPORTER_REPLY",
          createdAt: at,
          author: { firstName: "Sam", lastName: "Reporter" },
        },
      ],
      [
        {
          id: "hist-assigned",
          eventType: "ASSIGNED",
          createdAt: at,
          actor: { firstName: "Alex", lastName: "Handler" },
          payloadJson: { toUserId: "handler-1" },
        },
        {
          id: "hist-reporter",
          eventType: "REPORTER_MESSAGE",
          createdAt: at,
          actor: { firstName: "Sam", lastName: "Reporter" },
          payloadJson: { messageId: "msg-1" },
        },
      ],
    );

    expect(timeline).toHaveLength(2);
    expect(timeline.some((entry) => entry.kind === "history" && entry.id === "hist-assigned")).toBe(
      true,
    );
  });
});