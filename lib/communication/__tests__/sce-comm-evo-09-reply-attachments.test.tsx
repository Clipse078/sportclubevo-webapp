// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { inboxReplyComposerTestDefaults } from "@/lib/communication/inbox/inbox-reply-composer-contract";

const sampleDetail = {
  id: "conv-1",
  subject: "Test",
  status: "OPEN",
  mailboxOrganization: "INBOX",
  assignedToUserId: null,
  assignedToUser: null,
  messages: [
    {
      id: "msg-in",
      direction: "INBOUND",
      status: "RECEIVED",
      fromAddress: "a@example.com",
      bodyText: "Hi",
      bodyHtmlSanitized: null,
      sentAt: null,
      receivedAt: new Date().toISOString(),
      deliveryError: null,
    },
  ],
};

describe("SCE-COMM-EVO-09 inbox reply attachments contract", () => {
  it("does not throw when reply composer evaluates send disabled state with explicit empty attachments", () => {
    expect(() =>
      render(
        <CommunicationInboxConversationDetailPane
          selectedConversationId="conv-1"
          listItem={null}
          detail={sampleDetail}
          capabilities={{
            currentUserId: "user-1",
            canReply: true,
            canManage: false,
            canSettings: false,
          }}
          mailbox="INBOX"
          loading={false}
          detailError={null}
          actionBusy={false}
          onToggleStar={() => undefined}
          onArchive={() => undefined}
          onRestoreToInbox={() => undefined}
          onTrash={() => undefined}
          onRestoreFromTrash={() => undefined}
          onMarkRead={() => undefined}
          onMarkUnread={() => undefined}
          showProcessingToolbar={false}
          replyDisabled={false}
          repliesLockedInformOnly={false}
          replyText=""
          onReplyTextChange={() => undefined}
          onSendReply={vi.fn()}
          replySubmitting={false}
          replyError={null}
          actionError={null}
          onBackToList={() => undefined}
          onResolve={() => undefined}
          onReopen={() => undefined}
          onAssignToMe={() => undefined}
          onUnassign={() => undefined}
          onRetryDetail={() => undefined}
          visible
          hasAnyConversations
          {...inboxReplyComposerTestDefaults}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByRole("button", { name: "Antwort senden" })).toBeDisabled();
  });

  it("enables send when only READY attachments are present (no body text)", () => {
    render(
      <CommunicationInboxConversationDetailPane
        selectedConversationId="conv-1"
        listItem={null}
        detail={sampleDetail}
        capabilities={{
          currentUserId: "user-1",
          canReply: true,
          canManage: false,
          canSettings: false,
        }}
        mailbox="INBOX"
        loading={false}
        detailError={null}
        actionBusy={false}
        onToggleStar={() => undefined}
        onArchive={() => undefined}
        onRestoreToInbox={() => undefined}
        onTrash={() => undefined}
        onRestoreFromTrash={() => undefined}
        onMarkRead={() => undefined}
        onMarkUnread={() => undefined}
        showProcessingToolbar={false}
        replyDisabled={false}
        repliesLockedInformOnly={false}
        replyText=""
        onReplyTextChange={() => undefined}
        onSendReply={vi.fn()}
        replySubmitting={false}
        replyError={null}
        actionError={null}
        onBackToList={() => undefined}
        onResolve={() => undefined}
        onReopen={() => undefined}
        onAssignToMe={() => undefined}
        onUnassign={() => undefined}
        onRetryDetail={() => undefined}
        visible
        hasAnyConversations
        {...inboxReplyComposerTestDefaults}
        replyAttachments={[
          {
            localId: "local-1",
            attachmentId: "att-1",
            filename: "brief.pdf",
            contentType: "application/pdf",
            size: 100,
            status: "READY",
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Antwort senden" })).toBeEnabled();
  });
});
