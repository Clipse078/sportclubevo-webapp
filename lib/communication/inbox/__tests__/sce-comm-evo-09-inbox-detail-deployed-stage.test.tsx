// @vitest-environment jsdom
/**
 * SCE-COMM-EVO-09 — STAGE inbox detail path (IMAP EMAIL + DTO + route + client).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  mapCommunicationCenterConversationDetailForClient,
  serializeCommunicationCenterConversationDetailForApi,
} from "@/lib/communication/inbox/conversation-detail-client-dto";
import { buildRepresentativeImapEmailConversationDetailRecord } from "@/lib/communication/inbox/__tests__/imap-email-detail-fixture";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { inboxReplyComposerTestDefaults } from "@/lib/communication/inbox/inbox-reply-composer-contract";
import CommunicationInboxWorkspace from "@/components/admin/communication/inbox/CommunicationInboxWorkspace";

const serviceMocks = vi.hoisted(() => ({
  getCommunicationCenterConversationDetail: vi.fn(),
}));

vi.mock("@/lib/communication/inbox/conversation-service", () => ({
  getCommunicationCenterConversationDetail: serviceMocks.getCommunicationCenterConversationDetail,
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: vi.fn(async () => undefined),
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: vi.fn(async () => ({ id: "tenant-fca", key: "fca" })),
}));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "user-admin" } })),
}));

const { GET } = await import(
  "@/app/api/communication/inbox/conversations/[conversationId]/route"
);

describe("SCE-COMM-EVO-09 deployed STAGE inbox detail path", () => {
  it("reproduces pre-EVO-02 failure: raw Prisma graph is not JSON-serializable", () => {
    const raw = buildRepresentativeImapEmailConversationDetailRecord();
    expect(() => JSON.stringify({ conversation: raw })).toThrow(/serialize a BigInt/i);
  });

  it("maps representative IMAP EMAIL graph to JSON-safe DTO without internal fields", () => {
    const raw = buildRepresentativeImapEmailConversationDetailRecord();
    const { conversation } = serializeCommunicationCenterConversationDetailForApi(raw);
    const json = JSON.stringify({ conversation });
    expect(json).not.toContain("imapUid");
    expect(json).not.toContain("uidValidity");
    expect(json).not.toContain("storageKey");
    expect(json).not.toContain("checksumSha256");
    expect(json).not.toContain("ingestionMetadata");
    expect(conversation.channel).toBe("EMAIL");
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]?.attachments).toHaveLength(2);
    expect(conversation.messages[0]?.attachments[0]?.downloadAvailable).toBe(false);
    expect(conversation.messages[0]?.attachments[1]?.downloadAvailable).toBe(true);
    expect(conversation.messages[0]?.toAddresses).toEqual([
      "admin@club.example",
      "office@club.example",
    ]);
  });

  it("detail GET route returns HTTP 200 and serializable JSON for IMAP EMAIL data", async () => {
    serviceMocks.getCommunicationCenterConversationDetail.mockResolvedValue(
      buildRepresentativeImapEmailConversationDetailRecord(),
    );

    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ conversationId: "conv-imap-stage-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.conversation?.id).toBe("conv-imap-stage-1");
    expect(body.conversation?.messages?.[0]?.attachments?.length).toBe(2);
    expect(JSON.stringify(body)).not.toContain("BigInt");
  });

  it("detail GET route returns HTTP 500 when serialization would fail (regression guard)", async () => {
    const broken = buildRepresentativeImapEmailConversationDetailRecord();
    const dto = mapCommunicationCenterConversationDetailForClient(broken);
    serviceMocks.getCommunicationCenterConversationDetail.mockResolvedValue(broken);
    vi.spyOn(JSON, "stringify").mockImplementationOnce(() => {
      throw new TypeError("Do not serialize a BigInt");
    });

    const response = await GET(new Request("http://localhost/api/test"), {
      params: Promise.resolve({ conversationId: "conv-imap-stage-1" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe("DETAIL_SERIALIZATION_FAILED");
    expect(dto.id).toBe("conv-imap-stage-1");
    vi.mocked(JSON.stringify).mockRestore();
  });

  it("client detail pane renders IMAP-mapped payload without throwing (replyAttachments contract)", () => {
    const raw = buildRepresentativeImapEmailConversationDetailRecord();
    const { conversation } = serializeCommunicationCenterConversationDetailForApi(raw);

    expect(() =>
      render(
        <CommunicationInboxConversationDetailPane
          selectedConversationId={conversation.id}
          listItem={null}
          detail={conversation}
          capabilities={{
            currentUserId: "user-admin",
            canReply: true,
            canManage: true,
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
          showProcessingToolbar
          replyDisabled={false}
          repliesLockedInformOnly={false}
          replyText=""
          onReplyTextChange={() => undefined}
          onSendReply={() => undefined}
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

    expect(screen.getByRole("article", { name: "Eingehende Nachricht" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Ausgehende Nachricht" })).toBeInTheDocument();
  });
});

describe("SCE-COMM-EVO-09 inbox workspace retry after transient detail failure", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("1024px") ? window.innerWidth >= 1024 : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it("recovers via Erneut versuchen after simulated transient HTTP 500", async () => {
    const raw = buildRepresentativeImapEmailConversationDetailRecord();
    const { conversation } = serializeCommunicationCenterConversationDetailForApi(raw);
    let detailAttempts = 0;

    fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("workspace-preferences")) {
        return new Response(
          JSON.stringify({
            preference: {
              layout: "STANDARD",
              density: "STANDARD",
              listSplitPercent: 38,
              hasStoredPreference: false,
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("counts=1")) {
        return new Response(JSON.stringify({ counts: {} }), { status: 200 });
      }
      if (url.includes("/conversations?") && method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: conversation.id,
                subject: conversation.subject,
                previewText: "Wichtiger Hinweis",
                status: "OPEN",
                lastMessageAt: conversation.messages[0]?.receivedAt,
                assignedToUserId: conversation.assignedToUserId,
                assignedToDisplayName: "Club Admin",
                participantLabel: "Google Security",
                participantEmail: "security@google.com",
                unread: true,
                starred: false,
                mailboxOrganization: "INBOX",
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/read") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes(`/conversations/${conversation.id}`) && method === "GET") {
        detailAttempts += 1;
        if (detailAttempts === 1) {
          return new Response(JSON.stringify({ error: "temporary" }), { status: 500 });
        }
        return new Response(JSON.stringify({ conversation }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    const user = userEvent.setup();
    render(
      <CommunicationInboxWorkspace
        currentUserId="user-admin"
        canReply
        canManage
        canSettings={false}
      />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));

    await waitFor(() => {
      expect(screen.getByText("Die Konversation konnte nicht geladen werden.")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => {
      expect(screen.getByText("Bitte prüfen Sie Ihr Konto.")).toBeInTheDocument();
    });
    expect(detailAttempts).toBeGreaterThanOrEqual(2);
  });
});
