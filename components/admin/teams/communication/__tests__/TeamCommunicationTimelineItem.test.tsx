// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamCommunicationTimelineItem } from "@/components/admin/teams/communication/TeamCommunicationTimelineItem";
import type { TeamChatMessageDto } from "@/lib/communication/team/team-chat-service";

const baseFormal: TeamChatMessageDto = {
  id: "comm-alert",
  bodyText: "Training fällt aus.",
  subject: "Wetter",
  kind: "ALERT",
  status: "PUBLISHED",
  acknowledgementRequired: true,
  publishedAt: "2026-01-01T10:00:00.000Z",
  createdAt: "2026-01-01T09:00:00.000Z",
  senderPerson: { id: "p1", firstName: "Max", lastName: "Trainer" },
  replyTo: null,
  reactions: [],
  mentions: [],
  attachments: [],
  unreadForViewer: true,
  viewerEngagement: "READ",
  viewerAcknowledged: false,
  canAcknowledge: true,
};

describe("TeamCommunicationTimelineItem", () => {
  it("renders alert card with acknowledgement action", () => {
    render(
      <TeamCommunicationTimelineItem
        message={baseFormal}
        teamId="team-1"
        isOwn={false}
        canSend={false}
        pending={false}
        senderLabel="Max Trainer"
        formatTime={() => "01.01. 11:00"}
        onReply={vi.fn()}
        onToggleReaction={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    );

    expect(screen.getByTestId("team-formal-card-comm-alert")).toBeInTheDocument();
    expect(screen.getByTestId("team-formal-kind-badge")).toHaveTextContent("Alarm");
    expect(screen.getByTestId("team-formal-ack-button")).toBeInTheDocument();
  });

  it("renders chat message with reactions", () => {
    const chatMessage: TeamChatMessageDto = {
      ...baseFormal,
      id: "comm-msg",
      kind: "MESSAGE",
      subject: null,
      acknowledgementRequired: false,
      canAcknowledge: false,
      viewerEngagement: null,
      viewerAcknowledged: false,
      reactions: [{ reactionKey: "THUMBS_UP", count: 1, reactedBySelf: false }],
    };

    render(
      <TeamCommunicationTimelineItem
        message={chatMessage}
        teamId="team-1"
        isOwn={false}
        canSend
        pending={false}
        senderLabel="Max Trainer"
        formatTime={() => "01.01. 11:00"}
        onReply={vi.fn()}
        onToggleReaction={vi.fn()}
        onAcknowledge={vi.fn()}
      />,
    );

    expect(screen.getByTestId("team-chat-message-comm-msg")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-message-reactions")).toBeInTheDocument();
  });
});
