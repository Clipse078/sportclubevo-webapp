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
  poll: null,
  request: null,
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

  it("renders poll card with voting controls", () => {
    const pollMessage: TeamChatMessageDto = {
      ...baseFormal,
      id: "comm-poll",
      kind: "POLL",
      subject: "Turnier?",
      acknowledgementRequired: false,
      canAcknowledge: false,
      poll: {
        pollId: "poll-1",
        kind: "POLL",
        mode: "SINGLE",
        resultsVisibility: "AFTER_CLOSE",
        lifecycle: "OPEN",
        deadlineAt: null,
        closedAt: null,
        isExpired: false,
        isOpen: true,
        canRespond: true,
        canViewResults: false,
        canManage: false,
        canSelectWinner: false,
        canCreateEvent: false,
        selectedOptionId: null,
        createdEventId: null,
        viewerSelectedOptionIds: [],
        options: [
          {
            id: "opt-1",
            sortOrder: 0,
            label: "Basel",
            startAt: null,
            endAt: null,
            responseCount: 0,
          },
          {
            id: "opt-2",
            sortOrder: 1,
            label: "Bern",
            startAt: null,
            endAt: null,
            responseCount: 0,
          },
        ],
        results: null,
      },
    };

    render(
      <TeamCommunicationTimelineItem
        message={pollMessage}
        teamId="team-1"
        isOwn={false}
        canSend={false}
        pending={false}
        senderLabel="Max Trainer"
        formatTime={() => "01.01. 11:00"}
        onReply={vi.fn()}
        onToggleReaction={vi.fn()}
        onAcknowledge={vi.fn()}
        onSubmitPollResponse={vi.fn()}
      />,
    );

    expect(screen.getByTestId("team-poll-card-comm-poll")).toBeInTheDocument();
    expect(screen.getByTestId("team-poll-submit-response")).toBeInTheDocument();
  });

  it("renders request card with claim action", () => {
    const requestMessage: TeamChatMessageDto = {
      ...baseFormal,
      id: "comm-req",
      kind: "REQUEST",
      subject: "Helfer gesucht",
      acknowledgementRequired: false,
      canAcknowledge: false,
      request: {
        requestId: "req-1",
        kind: "REQUEST",
        lifecycle: "OPEN",
        deadlineAt: null,
        closedAt: null,
        eventId: null,
        isExpired: false,
        isOpen: true,
        canClaim: true,
        canManage: false,
        canViewClaimantDetail: false,
        viewerClaimedSlotIds: [],
        aggregate: {
          totalRequired: 2,
          totalClaimed: 0,
          totalRemaining: 2,
          fullSlotCount: 0,
          openSlotCount: 1,
          isFull: false,
        },
        slots: [
          {
            id: "slot-1",
            sortOrder: 0,
            label: "Grill",
            description: null,
            requiredCapacity: 2,
            claimedCapacity: 0,
            remainingCapacity: 2,
            isFull: false,
            startAt: null,
            endAt: null,
            viewerHasClaim: false,
          },
        ],
      },
    };

    render(
      <TeamCommunicationTimelineItem
        message={requestMessage}
        teamId="team-1"
        isOwn={false}
        canSend={false}
        pending={false}
        senderLabel="Max Trainer"
        formatTime={() => "01.01. 11:00"}
        onReply={vi.fn()}
        onToggleReaction={vi.fn()}
        onAcknowledge={vi.fn()}
        onClaimRequestSlot={vi.fn()}
      />,
    );

    expect(screen.getByTestId("team-request-card-comm-req")).toBeInTheDocument();
    expect(screen.getByTestId("team-request-claim-slot-1")).toBeInTheDocument();
  });
});
