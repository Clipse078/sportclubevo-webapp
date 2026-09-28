// @vitest-environment jsdom
/**
 * SCE-COMM-EVO-02 — inbox detail DTO boundary + reliability contracts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import {
  CommunicationCenterChannel,
  CommunicationCenterConversationStatus,
  CommunicationCenterMailboxOrganization,
  CommunicationCenterMessageDirection,
  CommunicationCenterMessageStatus,
} from "@prisma/client";
import {
  mapCommunicationCenterConversationDetailForClient,
  type CommunicationCenterConversationDetailRecord,
} from "@/lib/communication/inbox/conversation-detail-client-dto";
import {
  defaultListSplitPercentForLayout,
  defaultInboxWorkspacePreference,
} from "@/lib/communication/inbox/inbox-workspace-preferences";
import { useCommunicationInboxWorkspacePreferences } from "@/components/admin/communication/inbox/useCommunicationInboxWorkspacePreferences";
import { CommunicationInboxViewControl } from "@/components/admin/communication/inbox/CommunicationInboxViewControl";

function buildEmailDetailRecord(): CommunicationCenterConversationDetailRecord {
  const receivedAt = new Date("2026-09-28T12:00:00.000Z");
  return {
    id: "conv-email-1",
    tenantId: "tenant-a",
    mailboxId: "mailbox-1",
    channel: CommunicationCenterChannel.EMAIL,
    status: CommunicationCenterConversationStatus.OPEN,
    mailboxOrganization: CommunicationCenterMailboxOrganization.INBOX,
    mailboxOrganizationBeforeTrash: null,
    subject: "Sicherheitswarnung",
    threadRootMessageId: "msg-root",
    previewText: "Hello",
    lastMessageAt: receivedAt,
    assignedToUserId: null,
    assignedByUserId: null,
    assignedAt: null,
    contactMatchStatus: "UNMATCHED",
    matchedPersonId: null,
    matchedSponsorContactId: null,
    platformCommunicationId: null,
    repliesAllowed: true,
    searchText: "hello",
    createdAt: receivedAt,
    updatedAt: receivedAt,
    matchedPerson: null,
    matchedSponsorContact: null,
    assignedToUser: null,
    contextLinks: [],
    readStates: [],
    messages: [
      {
        id: "msg-1",
        tenantId: "tenant-a",
        conversationId: "conv-email-1",
        mailboxId: "mailbox-1",
        folderId: "folder-1",
        direction: CommunicationCenterMessageDirection.INBOUND,
        status: CommunicationCenterMessageStatus.RECEIVED,
        imapUid: 42n,
        uidValidity: 169n,
        providerMessageKey: "169:42",
        messageIdHeader: "<a@b.c>",
        inReplyTo: null,
        references: null,
        fromAddress: "security@google.com",
        fromDisplayName: "Google Security",
        toAddresses: ["admin@club.example"],
        ccAddresses: null,
        subject: "Sicherheitswarnung",
        bodyText: "Hello",
        bodyHtmlSanitized: "<p>Hello</p>",
        remoteImagesBlocked: true,
        receivedAt,
        sentAt: null,
        outboundIdempotencyKey: null,
        providerMessageId: null,
        deliveryError: null,
        createdByUserId: null,
        createdAt: receivedAt,
        updatedAt: receivedAt,
        attachmentLinks: [
          {
            id: "link-1",
            tenantId: "tenant-a",
            messageId: "msg-1",
            attachmentId: "att-1",
            sortOrder: 0,
            createdAt: receivedAt,
            attachment: {
              id: "att-1",
              tenantId: "tenant-a",
              storageKey: "communication/tenant-a/secret-key/file.pdf",
              originalFilename: "file.pdf",
              sanitizedFilename: "file.pdf",
              contentType: "application/pdf",
              sizeBytes: 2048,
              checksumSha256: "abc",
              sourceType: "INBOUND",
              sourceDocumentId: null,
              sourceDocumentVersionId: null,
              ingestionMetadata: { imapPartId: "2" },
              lifecycleStatus: "READY",
              scanStatus: "CLEAN",
              createdByUserId: null,
              createdAt: receivedAt,
            },
          },
        ],
      },
    ],
  };
}

describe("SCE-COMM-EVO-02 inbox detail DTO", () => {
  it("maps EMAIL messages with BigInt IMAP fields to JSON-safe DTO", () => {
    const dto = mapCommunicationCenterConversationDetailForClient(buildEmailDetailRecord());
    expect(() => JSON.stringify({ conversation: dto })).not.toThrow();
    expect(dto.messages[0]?.bodyText).toBe("Hello");
    expect(dto.messages[0]?.receivedAt).toBe("2026-09-28T12:00:00.000Z");
    expect(JSON.stringify(dto)).not.toContain("imapUid");
    expect(JSON.stringify(dto)).not.toContain("uidValidity");
    expect(JSON.stringify(dto)).not.toContain("storageKey");
    expect(JSON.stringify(dto)).not.toContain("tenant-a");
  });

  it("includes attachment metadata without private storage fields", () => {
    const dto = mapCommunicationCenterConversationDetailForClient(buildEmailDetailRecord());
    expect(dto.messages[0]?.attachments).toEqual([
      {
        id: "att-1",
        filename: "file.pdf",
        contentType: "application/pdf",
        sizeBytes: 2048,
        downloadAvailable: true,
        previewAvailable: true,
      },
    ]);
  });

  it("maps SCE-native conversations without IMAP fields", () => {
    const record = buildEmailDetailRecord();
    record.channel = CommunicationCenterChannel.SCE;
    record.messages[0]!.imapUid = null;
    record.messages[0]!.uidValidity = null;
    const dto = mapCommunicationCenterConversationDetailForClient(record);
    expect(dto.channel).toBe("SCE");
    expect(() => JSON.stringify({ conversation: dto })).not.toThrow();
  });

  it("detail route maps through DTO after authorization", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "app/api/communication/inbox/conversations/[conversationId]/route.ts"),
      "utf8",
    );
    expect(routeSource).toContain("serializeCommunicationCenterConversationDetailForApi");
    expect(routeSource.indexOf("getCommunicationCenterConversationDetail")).toBeLessThan(
      routeSource.indexOf("serializeCommunicationCenterConversationDetailForApi"),
    );
  });
});

describe("SCE-COMM-EVO-02 inbox Ansicht reliability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("applies canonical preset split when switching layout", () => {
    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());
    act(() => {
      result.current.setLayout("READING_LARGE");
    });
    expect(result.current.preference.listSplitPercent).toBe(
      defaultListSplitPercentForLayout("READING_LARGE"),
    );
  });

  it("ignores stale initial GET after newer local layout selection", async () => {
    let resolveGet: ((value: Response) => void) | undefined;
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });

    vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/communication/inbox/workspace-preferences") && init?.method !== "PUT") {
        return getPromise;
      }
      if (url.includes("/api/communication/inbox/workspace-preferences") && init?.method === "PUT") {
        return new Promise(() => undefined);
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());

    act(() => {
      result.current.setLayout("READING_LARGE");
    });

    await act(async () => {
      resolveGet!(
        new Response(
          JSON.stringify({ preference: defaultInboxWorkspacePreference() }),
          { status: 200 },
        ),
      );
    });

    await waitFor(() => {
      expect(result.current.preference.layout).toBe("READING_LARGE");
    });
  });

  it("surfaces preference persistence errors visibly", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/api/communication/inbox/workspace-preferences") && init?.method === "PUT") {
        return Promise.resolve(new Response("{}", { status: 500 }));
      }
      if (url.includes("/api/communication/inbox/workspace-preferences")) {
        return Promise.resolve(
          new Response(JSON.stringify({ preference: defaultInboxWorkspacePreference() }), {
            status: 200,
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());
    await waitFor(() => {
      expect(result.current.preference.layout).toBe("STANDARD");
    });

    act(() => {
      result.current.setDensity("COMPACT");
    });

    await waitFor(() => {
      expect(result.current.persistError).toBe("Ansicht konnte nicht gespeichert werden.");
    });

    render(
      <CommunicationInboxViewControl
        layout={result.current.preference.layout}
        density={result.current.preference.density}
        onLayoutChange={() => undefined}
        onDensityChange={() => undefined}
        onResetDefaults={() => undefined}
        persistError={result.current.persistError}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Ansicht konnte nicht gespeichert werden.");
    expect(screen.getByRole("status")).not.toHaveClass("sr-only");
  });

  it("does not mutate stored desktop layout when responsive shell forces master-detail", () => {
    const layoutSource = readFileSync(
      join(
        process.cwd(),
        "components/admin/communication/inbox/CommunicationInboxWorkspaceLayout.tsx",
      ),
      "utf8",
    );
    expect(layoutSource).toContain("useMasterDetail = !isLg || forcedMasterDetail");
    expect(layoutSource).not.toContain("onLayoutChange");
    expect(layoutSource).not.toContain("setLayout");
  });

  it("covers all six desktop layout modes in preferences", () => {
    expect(defaultListSplitPercentForLayout("STANDARD")).toBe(38);
    expect(defaultListSplitPercentForLayout("READING_LARGE")).toBe(28);
    expect(defaultListSplitPercentForLayout("LIST_LARGE")).toBe(50);
    expect(defaultListSplitPercentForLayout("BOTTOM")).toBe(42);
    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());
    for (const layout of [
      "FULL_READING",
      "LIST_ONLY",
    ] as const) {
      act(() => {
        result.current.setLayout(layout);
      });
      expect(result.current.preference.layout).toBe(layout);
    }
  });

  it("resets to defaults via resetToDefaults", () => {
    const { result } = renderHook(() => useCommunicationInboxWorkspacePreferences());
    act(() => {
      result.current.setLayout("LIST_LARGE");
      result.current.setDensity("SPACIOUS");
    });
    act(() => {
      result.current.resetToDefaults();
    });
    expect(result.current.preference).toEqual(defaultInboxWorkspacePreference());
  });
});
