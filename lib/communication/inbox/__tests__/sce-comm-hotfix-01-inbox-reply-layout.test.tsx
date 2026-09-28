// @vitest-environment jsdom
/**
 * SCE-COMM-HOTFIX-01 — Inbox workspace height, detail scroll, reply visibility.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { CommunicationInboxWorkspaceLayout } from "@/components/admin/communication/inbox/CommunicationInboxWorkspaceLayout";
import {
  INBOX_DETAIL_SCROLL_CLASS,
  INBOX_LIST_SCROLL_CLASS,
  INBOX_PANE_SHELL_CLASS,
  INBOX_WORKSPACE_HEIGHT_CLASS,
  INBOX_WORKSPACE_HEIGHT_MOBILE_OVERRIDE,
} from "@/lib/communication/inbox/inbox-workspace-layout-contract";
import {
  INBOX_WORKSPACE_LAYOUTS,
  type InboxWorkspaceLayout,
} from "@/lib/communication/inbox/inbox-workspace-preferences";
import { inboxReplyComposerTestDefaults } from "@/lib/communication/inbox/inbox-reply-composer-contract";
import { buildLongImapPlainTextBody } from "@/lib/communication/inbox/__tests__/imap-email-detail-fixture";
import type { InboxConversationListItem } from "@/components/admin/communication/inbox/inbox-workspace-types";

const longBody = buildLongImapPlainTextBody();

const listItem: InboxConversationListItem = {
  id: "conv-long",
  subject: "Sicherheitswarnung",
  previewText: longBody.slice(0, 120),
  status: "OPEN",
  lastMessageAt: new Date("2026-09-28T09:00:00.000Z").toISOString(),
  assignedToUserId: "user-1",
  assignedToDisplayName: "Club Admin",
  participantLabel: "Google Security",
  participantEmail: "security@google.com",
  unread: false,
  starred: false,
  mailboxOrganization: "INBOX",
};

function detailWithLongBody() {
  return {
    id: "conv-long",
    subject: "Sicherheitswarnung",
    status: "OPEN" as const,
    mailboxOrganization: "INBOX" as const,
    assignedToUserId: "user-1",
    assignedToUser: { id: "user-1", firstName: "Club", lastName: "Admin" },
    repliesAllowed: true,
    messages: [
      {
        id: "msg-long",
        direction: "INBOUND" as const,
        status: "RECEIVED" as const,
        fromAddress: "security@google.com",
        fromDisplayName: "Google Security",
        bodyText: longBody,
        bodyHtmlSanitized: null,
        sentAt: null,
        receivedAt: listItem.lastMessageAt,
        deliveryError: null,
        attachments: [
          {
            id: "att-1",
            originalFilename: "report.pdf",
            sanitizedFilename: "report.pdf",
            contentType: "application/pdf",
            sizeBytes: 4096,
            lifecycleStatus: "READY",
            scanStatus: "CLEAN",
          },
        ],
      },
    ],
  };
}

function renderDetailPane() {
  return render(
    <CommunicationInboxConversationDetailPane
      selectedConversationId="conv-long"
      listItem={listItem}
      detail={detailWithLongBody()}
      capabilities={{ currentUserId: "user-1", canReply: true, canManage: true, canSettings: false }}
      mailbox="INBOX"
      loading={false}
      detailError={null}
      actionBusy={false}
      onRetryDetail={() => undefined}
      onToggleStar={() => undefined}
      onArchive={() => undefined}
      onRestoreToInbox={() => undefined}
      onTrash={() => undefined}
      onRestoreFromTrash={() => undefined}
      onMarkRead={() => undefined}
      onMarkUnread={() => undefined}
      showProcessingToolbar
      replyDisabled={false}
      repliesLockedInformOnly={false}
      replyText="Entwurf"
      onReplyTextChange={() => undefined}
      replyUseSignature
      onReplyUseSignatureChange={() => undefined}
      replySignatureBody="Mit freundlichen Grüßen\nClub Admin"
      onSendReply={() => undefined}
      replySubmitting={false}
      replyError={null}
      actionError={null}
      onBackToList={() => undefined}
      onResolve={() => undefined}
      onReopen={() => undefined}
      onAssignToMe={() => undefined}
      onUnassign={() => undefined}
      visible
      hasAnyConversations
      {...inboxReplyComposerTestDefaults}
    />,
  );
}

describe("SCE-COMM-HOTFIX-01 inbox reply layout", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("1024px") ? window.innerWidth >= 1024 : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it("establishes workspace viewport height contract without document tail growth", () => {
    render(
      <div
        className={`${INBOX_WORKSPACE_HEIGHT_CLASS} ${INBOX_WORKSPACE_HEIGHT_MOBILE_OVERRIDE}`}
        data-communication-inbox-workspace
      >
        <div className="min-h-0 flex-1" data-communication-inbox-layout />
      </div>,
    );
    const root = document.querySelector("[data-communication-inbox-workspace]");
    expect(root).toBeTruthy();
    const className = (root as HTMLElement).className;
    expect(className).toContain("overflow-hidden");
    expect(className).toContain("calc(100dvh-12rem)");
    expect(className).toContain("max-lg:h-auto");
  });

  it("keeps list and detail scroll regions inside bounded panes", () => {
    renderDetailPane();
    const pane = screen.getByLabelText("Konversationsdetail");
    expect(pane.className).toContain("overflow-hidden");
    expect(pane.className).toContain("h-full");

    const scroll = document.querySelector("[data-inbox-detail-scroll]");
    expect(scroll).toBeTruthy();
    for (const token of INBOX_DETAIL_SCROLL_CLASS.split(/\s+/)) {
      expect((scroll as HTMLElement).className).toContain(token);
    }
  });

  it("places Antwort and reply controls after message content inside detail scroll flow", () => {
    renderDetailPane();
    const scroll = document.querySelector("[data-inbox-detail-scroll]") as HTMLElement;
    expect(scroll).toBeTruthy();

    const messageArticle = within(scroll).getByRole("article", { name: "Eingehende Nachricht" });
    const replySection = scroll.querySelector("[data-inbox-reply-section]");
    const editor = scroll.querySelector("[data-inbox-reply-editor]");
    const signature = scroll.querySelector("[data-inbox-reply-signature]");
    const attachments = scroll.querySelector("[data-inbox-reply-attachments]");
    const send = scroll.querySelector("[data-inbox-reply-send]");

    expect(messageArticle.compareDocumentPosition(replySection!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByLabelText("Antwort")).toBe(editor);
    expect(signature).toBeTruthy();
    expect(attachments).toBeTruthy();
    expect(within(send as HTMLElement).getByRole("button", { name: "Antwort senden" })).toBeTruthy();
    expect(scroll.contains(replySection)).toBe(true);
    expect(scroll.textContent).toContain("Absatz 1:");
    expect(scroll.textContent).toContain("Absatz 48:");
  });

  it("documents list pane overflow ownership", () => {
    const listScrollClasses = INBOX_LIST_SCROLL_CLASS.split(/\s+/);
    expect(listScrollClasses).toContain("overflow-y-auto");
    expect(listScrollClasses).toContain("min-h-0");
    expect(INBOX_PANE_SHELL_CLASS).toContain("h-full");
  });

  describe.each(INBOX_WORKSPACE_LAYOUTS)("layout preset %s", (layout: InboxWorkspaceLayout) => {
    it("wires pane shells and scroll contract in workspace layout shell", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1280,
      });

      render(
        <CommunicationInboxWorkspaceLayout
          layout={layout}
          listSplitPercent={38}
          onListSplitPercentChange={() => undefined}
          onSplitPersist={() => undefined}
          mobilePane={layout === "LIST_ONLY" ? "list" : "detail"}
          selectedId={layout === "LIST_ONLY" ? null : "conv-long"}
          list={<div data-inbox-list-pane>list</div>}
          detail={<div data-inbox-detail-pane>detail</div>}
        />,
      );

      const layoutRoot = document.querySelector("[data-communication-inbox-layout]");
      expect(layoutRoot?.className).toContain("min-h-0");
      expect(layoutRoot?.className).toContain("flex-1");

      const paneShells = layoutRoot?.querySelectorAll("[data-inbox-list-pane], [data-inbox-detail-pane]");
      expect(paneShells && paneShells.length >= 1).toBe(true);

      if (layout === "LIST_ONLY") {
        expect(screen.queryByText("detail")).not.toBeInTheDocument();
        expect(screen.getByText("list")).toBeInTheDocument();
      } else if (layout === "FULL_READING") {
        expect(screen.getByText("detail")).toBeInTheDocument();
      } else {
        expect(screen.getByText("list")).toBeInTheDocument();
        expect(screen.getByText("detail")).toBeInTheDocument();
      }
    });
  });

  it("mobile workspace does not force desktop fixed height class on small viewports", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
    const workspaceSource = INBOX_WORKSPACE_HEIGHT_MOBILE_OVERRIDE;
    expect(workspaceSource).toContain("max-lg:h-auto");
    expect(workspaceSource).toContain("max-lg:max-h-none");
  });
});
