// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamChatView from "@/components/admin/teams/communication/TeamChatView";

vi.mock("@/app/(admin)/dashboard/teams/[teamId]/kommunikation/actions", () => ({
  loadOlderTeamChatMessagesAction: vi.fn(),
  markTeamChatReadAction: vi.fn(async () => ({ ok: true })),
  sendTeamChatMessageAction: vi.fn(async () => ({ ok: true })),
  sendTeamAnnouncementAction: vi.fn(async () => ({ ok: true })),
  sendTeamAlertAction: vi.fn(async () => ({ ok: true })),
  acknowledgeTeamCommunicationAction: vi.fn(async () => ({ ok: true })),
  toggleTeamChatReactionAction: vi.fn(async () => ({ ok: true })),
  sendTeamPollAction: vi.fn(async () => ({ ok: true })),
  submitTeamPollResponseAction: vi.fn(async () => ({ ok: true })),
  closeTeamPollAction: vi.fn(async () => ({ ok: true })),
  selectDatePollWinnerAction: vi.fn(async () => ({ ok: true })),
  createEventFromDatePollAction: vi.fn(async () => ({ ok: true })),
}));

const baseMessage = {
  id: "comm-1",
  bodyText: "Hallo Team",
  subject: null,
  kind: "MESSAGE",
  status: "PUBLISHED",
  acknowledgementRequired: false,
  publishedAt: "2026-01-01T10:00:00.000Z",
  createdAt: "2026-01-01T09:00:00.000Z",
  senderPerson: { id: "p1", firstName: "Max", lastName: "Trainer" },
  replyTo: null,
  reactions: [{ reactionKey: "THUMBS_UP" as const, count: 2, reactedBySelf: false }],
  mentions: [],
  attachments: [{ id: "a1", attachmentId: "a1", originalFilename: "plan.pdf", contentType: "application/pdf", sizeBytes: 100, sortOrder: 0 }],
  unreadForViewer: true,
  viewerEngagement: "READ",
  viewerAcknowledged: false,
  canAcknowledge: false,
  poll: null,
  request: null,
};

describe("TeamChatView", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders stream, composer, reactions, attachments, and unread badge", () => {
    render(
      <TeamChatView
        teamId="team-1"
        initialMessages={[baseMessage]}
        initialOlderCursor={null}
        initialHasMoreOlder={false}
        canSend
        viewerPersonId="p2"
        initialUnreadCount={3}
      />,
    );

    expect(screen.getByTestId("team-chat-view")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-stream")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-composer")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-unread-badge")).toHaveTextContent("3 ungelesen");
    expect(screen.getByTestId("team-chat-message-comm-1")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-message-attachments")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-message-reactions")).toBeInTheDocument();
    expect(screen.getByTestId("team-chat-reply-button")).toBeInTheDocument();
    expect(screen.getByTestId("team-communication-type-selector")).toBeInTheDocument();
    expect(screen.getByTestId("team-comm-mode-poll")).toBeInTheDocument();
    expect(screen.getByTestId("team-comm-mode-date_poll")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(
      <TeamChatView
        teamId="team-1"
        initialMessages={[]}
        initialOlderCursor={null}
        initialHasMoreOlder={false}
        canSend={false}
        viewerPersonId={null}
        initialUnreadCount={0}
      />,
    );

    expect(screen.getByTestId("team-chat-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("team-chat-composer")).not.toBeInTheDocument();
  });
});
