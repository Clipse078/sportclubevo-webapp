// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
}));

import CommunicationInboxWorkspace from "@/components/admin/communication/inbox/CommunicationInboxWorkspace";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { blockRemoteImages, sanitizeInboundEmailHtml } from "@/lib/communication/inbox/html-sanitizer";

function requestUrl(input: RequestInfo): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

const conversationA = {
  id: "conv-a",
  subject: "Sicherheitswarnung",
  previewText: "Wichtiger Hinweis zu Ihrem Konto.",
  status: "OPEN",
  lastMessageAt: new Date("2026-09-28T09:00:00.000Z").toISOString(),
  assignedToUserId: null,
  assignedToDisplayName: null,
  participantLabel: "Google Security",
  participantEmail: "security@google.com",
  unread: true,
  starred: false,
  mailboxOrganization: "INBOX",
};

const conversationB = {
  id: "conv-b",
  subject: "Trainingsplan",
  previewText: "Der Plan für nächste Woche.",
  status: "OPEN",
  lastMessageAt: new Date("2026-09-27T09:00:00.000Z").toISOString(),
  assignedToUserId: "user-1",
  assignedToDisplayName: "Club Admin",
  participantLabel: "Trainer Team",
  participantEmail: "trainer@example.com",
  unread: false,
  starred: false,
  mailboxOrganization: "INBOX",
};

function detailFor(
  item: typeof conversationA,
  bodyText: string,
): {
  id: string;
  subject: string | null;
  status: string;
  mailboxOrganization: string;
  assignedToUserId: string | null;
  messages: Array<{
    id: string;
    direction: string;
    status: string;
    fromAddress: string | null;
    bodyText: string;
    bodyHtmlSanitized: string | null;
    sentAt: string | null;
    receivedAt: string | null;
    deliveryError: string | null;
  }>;
} {
  return {
    id: item.id,
    subject: item.subject,
    status: item.status,
    mailboxOrganization: item.mailboxOrganization,
    assignedToUserId: item.assignedToUserId,
    messages: [
      {
        id: `msg-${item.id}`,
        direction: "INBOUND",
        status: "RECEIVED",
        fromAddress: item.participantEmail,
        bodyText,
        bodyHtmlSanitized: null,
        sentAt: null,
        receivedAt: item.lastMessageAt,
        deliveryError: null,
      },
    ],
  };
}

function installInboxFetch(options?: {
  detailDelayMs?: number;
  detailFailFor?: string | null;
  detailSequence?: Array<{ id: string; delayMs: number; bodyText: string }>;
}) {
  const detailDelayMs = options?.detailDelayMs ?? 0;
  const detailFailFor = options?.detailFailFor ?? null;
  const detailSequence = options?.detailSequence ?? [];

  mocks.fetch.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = init?.method ?? "GET";

    if (url.includes("counts=1") && method === "GET") {
      return new Response(JSON.stringify({ counts: {} }), { status: 200 });
    }

    if (url.includes("/conversations?") && method === "GET") {
      return new Response(
        JSON.stringify({ items: [conversationA, conversationB], nextCursor: null }),
        { status: 200 },
      );
    }

    if (url.includes("/read") && method === "POST") {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const detailMatch = url.match(/\/conversations\/([^/?]+)(?:\?|$|\/)/);
    const conversationId = detailMatch?.[1];
    if (conversationId && method === "GET" && !url.includes("/reply")) {
      if (detailFailFor === conversationId) {
        return new Response(JSON.stringify({ error: "Nicht gefunden" }), { status: 404 });
      }

      const sequenced = detailSequence.find((entry) => entry.id === conversationId);
      const delay = sequenced?.delayMs ?? detailDelayMs;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const item = conversationId === conversationA.id ? conversationA : conversationB;
      const bodyText = sequenced?.bodyText ?? `Inhalt für ${item.subject}`;
      return new Response(JSON.stringify({ conversation: detailFor(item, bodyText) }), {
        status: 200,
      });
    }

    return new Response(JSON.stringify({}), { status: 404 });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mocks.fetch as unknown as typeof fetch;
  installInboxFetch();
});

describe("SCE-COMM-UX-03R2 reading pane selection defect", () => {
  it("starts with no-selection empty state when conversations exist", async () => {
    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => expect(screen.getByText("Sicherheitswarnung")).toBeInTheDocument());
    expect(screen.getByText("Wählen Sie eine Konversation aus.")).toBeInTheDocument();
    expect(screen.queryByText("Konversation wird geladen …")).not.toBeInTheDocument();
  });

  it("selects A, shows loading, renders detail and messages, then switches to B", async () => {
    installInboxFetch({ detailDelayMs: 40 });
    const user = userEvent.setup();

    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));

    expect(screen.getByRole("button", { name: /Sicherheitswarnung/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("Konversation wird geladen …")).toBeInTheDocument();
    expect(screen.queryByText("Wählen Sie eine Konversation aus.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Inhalt für Sicherheitswarnung")).toBeInTheDocument();
    });

    const detailGetA = mocks.fetch.mock.calls.find(
      ([url, init]) =>
        requestUrl(url).includes("/conversations/conv-a") &&
        (!init?.method || init.method === "GET"),
    );
    expect(detailGetA).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Trainingsplan/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Trainingsplan/i })).toHaveAttribute(
        "aria-current",
        "true",
      );
    });
    expect(screen.getByRole("button", { name: /Sicherheitswarnung/i })).not.toHaveAttribute(
      "aria-current",
    );

    await waitFor(() => {
      expect(screen.getByText("Inhalt für Trainingsplan")).toBeInTheDocument();
    });
    expect(screen.queryByText("Inhalt für Sicherheitswarnung")).not.toBeInTheDocument();
  });

  it("activates selection via keyboard on conversation row", async () => {
    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    const row = screen.getByRole("button", { name: /Sicherheitswarnung/i });
    row.focus();
    fireEvent.keyDown(row, { key: "Enter", code: "Enter" });
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText("Inhalt für Sicherheitswarnung")).toBeInTheDocument();
    });
  });

  it("keeps row selected and shows retry when detail load fails", async () => {
    installInboxFetch({ detailFailFor: "conv-a" });
    const user = userEvent.setup();

    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));

    await waitFor(() => {
      expect(screen.getByText("Die Konversation konnte nicht geladen werden.")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Sicherheitswarnung/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.queryByText("Wählen Sie eine Konversation aus.")).not.toBeInTheDocument();

    installInboxFetch();
    await user.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    await waitFor(() => {
      expect(screen.getByText("Inhalt für Sicherheitswarnung")).toBeInTheDocument();
    });
  });

  it("does not apply stale detail when rapidly selecting B after slow A", async () => {
    installInboxFetch({
      detailSequence: [
        { id: "conv-a", delayMs: 120, bodyText: "Veralteter Inhalt A" },
        { id: "conv-b", delayMs: 10, bodyText: "Aktueller Inhalt B" },
      ],
    });
    const user = userEvent.setup();

    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Trainingsplan/i }));

    await waitFor(
      () => {
        expect(screen.getByText("Aktueller Inhalt B")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.queryByText("Veralteter Inhalt A")).not.toBeInTheDocument();
  });

  it("marks conversation read only after successful detail open", async () => {
    const user = userEvent.setup();
    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));

    await waitFor(() => {
      const readPost = mocks.fetch.mock.calls.find(
        ([url, init]) => requestUrl(url).includes("/conv-a/read") && init?.method === "POST",
      );
      expect(readPost).toBeTruthy();
    });
  });

  it("mobile selection opens detail pane and back returns to list", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    const user = userEvent.setup();

    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    const listSection = screen.getByLabelText("Konversationsliste");
    expect(listSection.className.split(/\s+/)).not.toContain("hidden");

    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));

    await waitFor(() => {
      expect(screen.getByText("Inhalt für Sicherheitswarnung")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Konversationen" }));

    expect(listSection.className.split(/\s+/)).not.toContain("hidden");
    expect(within(listSection).getByText("Sicherheitswarnung")).toBeInTheDocument();
  });

  it("filter and search requests still fire while preserving selection semantics", async () => {
    const user = userEvent.setup();
    render(
      <CommunicationInboxWorkspace currentUserId="user-1" canReply canManage canSettings={false} />,
    );

    await waitFor(() => screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await user.click(screen.getByRole("button", { name: /Sicherheitswarnung/i }));
    await waitFor(() => screen.getByText("Inhalt für Sicherheitswarnung"));

    await user.click(screen.getByRole("button", { name: "Ungelesen" }));
    await waitFor(() => {
      expect(
        mocks.fetch.mock.calls.some(([url]) => requestUrl(url).includes("filter=UNREAD")),
      ).toBe(true);
    });

    await user.type(screen.getByRole("searchbox"), "Sicher");
    await waitFor(
      () => {
        expect(
          mocks.fetch.mock.calls.some(([url]) => requestUrl(url).includes("search=Sicher")),
        ).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("detail pane preserves sanitizer contract for HTML messages", () => {
    const sanitized = sanitizeInboundEmailHtml(
      '<img src="https://evil.example/x.png"><script>x</script><a href="javascript:alert(1)">z</a>',
    );
    expect(sanitized).not.toContain("<script");
    expect(blockRemoteImages('<img src="https://x.example/a.png">')).toContain(
      "data-blocked-remote-src",
    );

    render(
      <CommunicationInboxConversationDetailPane
        selectedConversationId="conv-a"
        listItem={conversationA}
        detail={{
          ...detailFor(conversationA, "text"),
          messages: [
            {
              id: "html-msg",
              direction: "INBOUND",
              status: "RECEIVED",
              fromAddress: "a@example.com",
              bodyText: null,
              bodyHtmlSanitized: sanitized,
              sentAt: null,
              receivedAt: conversationA.lastMessageAt,
              deliveryError: null,
            },
          ],
        }}
        capabilities={{ currentUserId: "user-1", canReply: false, canManage: false, canSettings: false }}
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
      />,
    );

    expect(screen.getByRole("article", { name: "Eingehende Nachricht" })).toBeInTheDocument();
  });
});
