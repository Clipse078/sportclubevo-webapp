// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  getRequestEffectivePermissions: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
}));
vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: mocks.getRequestEffectivePermissions,
}));

import CommunicationInboxPage from "../inbox/page";
import CommunicationInboxWorkspace from "@/components/admin/communication/inbox/CommunicationInboxWorkspace";
import { CommunicationInboxConversationList } from "@/components/admin/communication/inbox/CommunicationInboxConversationList";
import { CommunicationInboxToolbar } from "@/components/admin/communication/inbox/CommunicationInboxToolbar";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { INBOX_QUICK_FILTERS } from "@/components/admin/communication/inbox/inbox-workspace-types";
import { inboxReplyComposerTestDefaults } from "@/lib/communication/inbox/inbox-reply-composer-contract";
import { INBOX_VIEW_PERMISSIONS } from "@/lib/communication/inbox/route-access";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { blockRemoteImages, sanitizeInboundEmailHtml } from "@/lib/communication/inbox/html-sanitizer";

const TENANT_ID = "tenant-inbox-ux";

function requestUrl(input: RequestInfo): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const sampleListItem = {
  id: "conv-1",
  subject: "Anfrage Mitgliedschaft",
  previewText: "Guten Tag, ich möchte mich anmelden.",
  status: "OPEN",
  lastMessageAt: new Date("2026-09-28T08:42:00.000Z").toISOString(),
  assignedToUserId: "user-1",
  assignedToDisplayName: "Club Admin",
  participantLabel: "Maria Muster",
  participantEmail: "maria@example.com",
  unread: true,
  starred: false,
  mailboxOrganization: "INBOX",
};

const sampleDetail = {
  id: "conv-1",
  subject: "Anfrage Mitgliedschaft",
  status: "OPEN",
  mailboxOrganization: "INBOX",
  assignedToUserId: "user-1",
  assignedToUser: { id: "user-1", firstName: "Club", lastName: "Admin" },
  messages: [
    {
      id: "msg-in",
      direction: "INBOUND",
      status: "RECEIVED",
      fromAddress: "maria@example.com",
      fromDisplayName: "Maria Muster",
      bodyText: "Guten Tag",
      bodyHtmlSanitized: null,
      sentAt: null,
      receivedAt: new Date("2026-09-28T08:40:00.000Z").toISOString(),
      deliveryError: null,
    },
    {
      id: "msg-out",
      direction: "OUTBOUND",
      status: "SENT",
      fromAddress: "club@example.com",
      fromDisplayName: null,
      bodyText: "Danke für Ihre Nachricht",
      bodyHtmlSanitized: null,
      sentAt: new Date("2026-09-28T08:55:00.000Z").toISOString(),
      receivedAt: null,
      deliveryError: null,
    },
  ],
};

const listPropsBase = {
  mailbox: "INBOX" as const,
  selectedIds: new Set<string>(),
  canManage: true,
  bulkBusy: false,
  mailboxEmptyLabel: "Noch keine Konversationen",
  onToggleSelected: () => undefined,
  onToggleStar: () => undefined,
  onSelectAll: () => undefined,
  onBulkArchive: () => undefined,
  onBulkRestoreToInbox: () => undefined,
  onBulkTrash: () => undefined,
  onBulkRestoreFromTrash: () => undefined,
  onBulkMarkRead: () => undefined,
  onBulkMarkUnread: () => undefined,
  onBulkStar: () => undefined,
  onBulkUnstar: () => undefined,
  onClearSelection: () => undefined,
};

const detailPropsBase = {
  mailbox: "INBOX" as const,
  actionBusy: false,
  onToggleStar: () => undefined,
  onArchive: () => undefined,
  onRestoreToInbox: () => undefined,
  onTrash: () => undefined,
  onRestoreFromTrash: () => undefined,
  onMarkRead: () => undefined,
  onMarkUnread: () => undefined,
  showProcessingToolbar: true,
  replyDisabled: false,
  repliesLockedInformOnly: false,
  ...inboxReplyComposerTestDefaults,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("1024px") ? window.innerWidth >= 1024 : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  mocks.requireAnyPermission.mockResolvedValue({
    user: { id: "user-1", activeTenantId: TENANT_ID },
  });
  mocks.getRequestEffectivePermissions.mockResolvedValue({
    platform: [],
    tenant: [
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
      PERMISSIONS.COMMUNICATION_INBOX_REPLY,
      PERMISSIONS.COMMUNICATION_INBOX_MANAGE,
      PERMISSIONS.COMMUNICATION_INBOX_SETTINGS,
    ],
  });
  global.fetch = mocks.fetch as unknown as typeof fetch;
  mocks.fetch.mockImplementation(async (input: RequestInfo) => {
    const url = requestUrl(input);
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
    return new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 });
  });
});

describe("SCE-COMM-UX-03 Kommunikationscenter redesign", () => {
  it("authorized inbox page renders COMM-UX-01 shell and workspace", async () => {
    render(await CommunicationInboxPage());

    expect(mocks.requireAnyPermission).toHaveBeenCalledWith(INBOX_VIEW_PERMISSIONS);
    expect(screen.getByRole("heading", { level: 1, name: "Kommunikationscenter" })).toBeInTheDocument();
    expect(screen.getByText("Nachrichten und Antworten zentral bearbeiten.")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.queryByText(/^Verfügbar$/)).not.toBeInTheDocument();
  });

  it("shows Postfach-Einstellungen only with settings permission", async () => {
    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_INBOX_VIEW],
    });
    render(await CommunicationInboxPage());
    expect(screen.queryByRole("link", { name: /Postfach-Einstellungen/i })).not.toBeInTheDocument();

    mocks.getRequestEffectivePermissions.mockResolvedValue({
      platform: [],
      tenant: [PERMISSIONS.COMMUNICATION_INBOX_VIEW, PERMISSIONS.COMMUNICATION_INBOX_SETTINGS],
    });
    render(await CommunicationInboxPage());
    expect(screen.getByRole("link", { name: /Postfach-Einstellungen/i })).toHaveAttribute(
      "href",
      "/dashboard/communication/inbox/settings",
    );
  });

  it("renders frequent filters and marks active filter", () => {
    render(
      <CommunicationInboxToolbar
        mailbox="INBOX"
        onMailboxChange={() => undefined}
        mailboxCounts={{}}
        filter="UNREAD"
        onFilterChange={() => undefined}
        search=""
        onSearchChange={() => undefined}
        onResetFilters={() => undefined}
        hasActiveFilters
        layout="STANDARD"
        density="STANDARD"
        onLayoutChange={() => undefined}
        onDensityChange={() => undefined}
        onResetViewDefaults={() => undefined}
      />,
    );

    for (const filter of INBOX_QUICK_FILTERS) {
      expect(screen.getByRole("button", { name: filter.label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Ungelesen" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Konversationen durchsuchen …",
    );
  });

  it("conversation row hierarchy, unread semantics, selection, assignment", () => {
    const { rerender } = render(
      <CommunicationInboxConversationList
        {...listPropsBase}
        conversations={[sampleListItem]}
        selectedId={null}
        currentUserId="user-2"
        loading={false}
        listError={null}
        emptyVariant="none"
        onSelect={() => undefined}
        onResetFilters={() => undefined}
        visible
        nextCursor={null}
        onLoadMore={() => undefined}
        loadingMore={false}
      />,
    );

    expect(screen.getByText("Maria Muster")).toBeInTheDocument();
    expect(screen.getByText("Anfrage Mitgliedschaft")).toBeInTheDocument();
    expect(screen.getByText(/Guten Tag, ich möchte/)).toBeInTheDocument();
    expect(screen.getByText("Club Admin")).toBeInTheDocument();
    expect(screen.getByText(/, ungelesen/i)).toBeInTheDocument();

    rerender(
      <CommunicationInboxConversationList
        {...listPropsBase}
        conversations={[sampleListItem]}
        selectedId="conv-1"
        currentUserId="user-2"
        loading={false}
        listError={null}
        emptyVariant="none"
        onSelect={() => undefined}
        onResetFilters={() => undefined}
        visible
        nextCursor={null}
        onLoadMore={() => undefined}
        loadingMore={false}
      />,
    );
    expect(screen.getByRole("button", { name: /Maria Muster/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("empty states: none, filter, search, none-selected", async () => {
    render(
      <CommunicationInboxConversationList
        {...listPropsBase}
        conversations={[]}
        selectedId={null}
        currentUserId="user-1"
        loading={false}
        listError={null}
        emptyVariant="none"
        onSelect={() => undefined}
        onResetFilters={() => undefined}
        visible
        nextCursor={null}
        onLoadMore={() => undefined}
        loadingMore={false}
      />,
    );
    expect(screen.getByText("Noch keine Konversationen")).toBeInTheDocument();

    render(
      <CommunicationInboxConversationList
        {...listPropsBase}
        conversations={[]}
        selectedId={null}
        currentUserId="user-1"
        loading={false}
        listError={null}
        emptyVariant="filter"
        onSelect={() => undefined}
        onResetFilters={() => undefined}
        visible
        nextCursor={null}
        onLoadMore={() => undefined}
        loadingMore={false}
      />,
    );
    expect(screen.getByText("Keine passenden Konversationen")).toBeInTheDocument();

    mocks.fetch.mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("counts=1")) {
        return new Response(JSON.stringify({ counts: {} }), { status: 200 });
      }
      if (url.includes("/conversations?")) {
        return new Response(JSON.stringify({ items: [sampleListItem], nextCursor: null }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ conversation: sampleDetail }), { status: 200 });
    });

    render(
      <CommunicationInboxWorkspace
        currentUserId="user-1"
        canReply
        canManage
        canSettings={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Maria Muster")).toBeInTheDocument();
    });
    expect(screen.getByText("Wählen Sie eine Konversation aus.")).toBeInTheDocument();
  });

  it("loads detail on selection and uses canonical reply path", async () => {
    mocks.fetch.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.includes("counts=1")) {
        return new Response(JSON.stringify({ counts: {} }), { status: 200 });
      }
      if (url.includes("/conversations?")) {
        return new Response(JSON.stringify({ items: [sampleListItem], nextCursor: null }), {
          status: 200,
        });
      }
      if (url.includes("/read") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/reply") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/conversations/conv-1") && !url.includes("/reply")) {
        return new Response(JSON.stringify({ conversation: sampleDetail }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    render(
      <CommunicationInboxWorkspace
        currentUserId="user-1"
        canReply
        canManage
        canSettings={false}
      />,
    );

    await waitFor(() => screen.getByText("Maria Muster"));
    fireEvent.click(screen.getByRole("button", { name: /Maria Muster/i }));

    await waitFor(() => {
      expect(screen.getByText("Guten Tag")).toBeInTheDocument();
    });
    const detailGet = mocks.fetch.mock.calls.find(
      ([url, init]) =>
        requestUrl(url).includes("/conversations/conv-1") &&
        (!init || init.method === undefined || init.method === "GET"),
    );
    expect(detailGet).toBeTruthy();
  });

  it("renders inbound/outbound timeline, manage, resolve/reopen, and reply composer", () => {
    const onSendReply = vi.fn();
    render(
      <CommunicationInboxConversationDetailPane
        {...detailPropsBase}
        selectedConversationId="conv-1"
        listItem={sampleListItem}
        detail={sampleDetail}
        capabilities={{
          currentUserId: "user-1",
          canReply: true,
          canManage: true,
          canSettings: false,
        }}
        loading={false}
        detailError={null}
        onRetryDetail={() => undefined}
        replyText=""
        onReplyTextChange={() => undefined}
        onSendReply={onSendReply}
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
      />,
    );

    expect(screen.getByRole("article", { name: "Eingehende Nachricht" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Ausgehende Nachricht" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Als erledigt markieren" })).toBeInTheDocument();
    expect(screen.getByLabelText("Antwort")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Antwort senden" })).toBeInTheDocument();
  });

  it("reply action uses existing canonical inbox reply API path", () => {
    const workspace = readRelative("components/admin/communication/inbox/CommunicationInboxWorkspace.tsx");
    expect(workspace).toContain("/api/communication/inbox/conversations/${selectedId}/reply");
    expect(workspace).toContain("idempotencyKey");
  });

  it("hides reply and manage affordances without permissions", () => {
    render(
      <CommunicationInboxConversationDetailPane
        {...detailPropsBase}
        selectedConversationId="conv-1"
        listItem={sampleListItem}
        detail={sampleDetail}
        capabilities={{
          currentUserId: "user-1",
          canReply: false,
          canManage: false,
          canSettings: false,
        }}
        loading={false}
        detailError={null}
        onRetryDetail={() => undefined}
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
        visible
        hasAnyConversations
      />,
    );

    expect(screen.getByRole("article", { name: "Eingehende Nachricht" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Antwort")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Als erledigt markieren" })).not.toBeInTheDocument();
  });

  it("resolve/reopen uses canonical OPEN and RESOLVED labels", () => {
    render(
      <CommunicationInboxConversationDetailPane
        {...detailPropsBase}
        selectedConversationId="conv-1"
        listItem={sampleListItem}
        detail={{ ...sampleDetail, status: "RESOLVED" }}
        capabilities={{
          currentUserId: "user-1",
          canReply: false,
          canManage: true,
          canSettings: false,
        }}
        loading={false}
        detailError={null}
        onRetryDetail={() => undefined}
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
        visible
        hasAnyConversations
      />,
    );

    expect(screen.getByText("Erledigt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wieder öffnen" })).toBeInTheDocument();
  });

  it("preserves bounded list retrieval and cursor pagination contract", () => {
    const workspace = readRelative("components/admin/communication/inbox/CommunicationInboxWorkspace.tsx");
    const list = readRelative("components/admin/communication/inbox/CommunicationInboxConversationList.tsx");
    const service = readRelative("lib/communication/inbox/conversation-service.ts");
    expect(workspace).toContain("nextCursor");
    expect(list).toContain("Weitere Konversationen");
    expect(service).toContain("take: limit + 1");
    expect(workspace).toMatch(/conversations\/\$\{conversationId\}/);
  });

  it("retains COMM-UX-01 module layout and COMM-UX-02 hub isolation", () => {
    const commLayout = readRelative("app/(admin)/dashboard/communication/layout.tsx");
    const hubInbox = readRelative("components/admin/communication/hub/CommunicationHubInboxSection.tsx");
    expect(commLayout).toContain("SCE_DASHBOARD_MODULE_PAGE_SURFACE");
    expect(hubInbox).toContain("Kommunikationscenter");
    expect(hubInbox).not.toContain("CommunicationInboxWorkspace");
  });

  it("mobile master/detail contract uses lg breakpoints", () => {
    const list = readRelative("components/admin/communication/inbox/CommunicationInboxConversationList.tsx");
    const detail = readRelative("components/admin/communication/inbox/CommunicationInboxConversationDetail.tsx");
    expect(list).toContain("hidden lg:flex");
    expect(detail).toContain("lg:hidden");
  });

  it("HTML sanitizer security invariants unchanged", () => {
    const sanitized = sanitizeInboundEmailHtml(
      '<img src="https://evil.example/x.png"><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    );
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
    expect(blockRemoteImages('<img src="https://x.example/a.png">')).toContain("data-blocked-remote-src");
  });

  it("tenant isolation remains in conversation service lookups", () => {
    const service = readRelative("lib/communication/inbox/conversation-service.ts");
    expect(service).toContain("tenantId: input.tenantId");
    expect(service).toContain("id: input.conversationId, tenantId: input.tenantId");
  });
});
