import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({})),
  },
}));

vi.mock("@/lib/notifications/preference-service", () => ({
  loadEffectivePreferencesForUsers: vi.fn(async () => new Map([["user-b", { inApp: true }]])),
}));

const createNotification = vi.fn();
vi.mock("@/lib/notifications/notification-service", () => ({
  createNotificationIdempotent: (...args: unknown[]) => createNotification(...args),
}));

vi.mock("@/lib/permissions/request-effective-permissions", () => ({
  getRequestEffectivePermissions: vi.fn(async () => ({
    platform: [],
    tenant: ["tenant_documentation.view"],
  })),
}));

vi.mock("@/lib/tenant-documentation/page-access-service", () => ({
  resolvePageEffectiveAccess: vi.fn(async () => "VIEW"),
}));

vi.mock("@/lib/tenant-documentation/authorization", () => ({
  resolveTenantDocumentationActor: vi.fn(async () => ({
    identity: { tenantId: "t1", userId: "user-b", personId: null },
    membership: { tenantId: "t1", orgUnitIds: new Set(), teamIds: new Set() },
    permissionKeys: ["tenant_documentation.view"],
  })),
  accessLevelPermits: vi.fn(() => true),
}));

import { emitTenantDocumentationMentionNotifications } from "@/lib/tenant-documentation/tenant-doc-mention-producer";

const mentionDoc = (userId: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "@Person",
          marks: [{ type: "taskDescriptionMention", attrs: { userId, label: "Person" } }],
        },
      ],
    },
  ],
});

describe("tenant documentation mention notifications", () => {
  beforeEach(() => {
    createNotification.mockReset();
  });

  it("notifies only newly mentioned users who can read", async () => {
    await emitTenantDocumentationMentionNotifications({
      tenantId: "t1",
      pageId: "page-1",
      pageTitle: "Protokoll",
      publishedVersionId: "ver-2",
      actorUserId: "user-a",
      actorDisplayName: "Publisher",
      previousPublishedContent: mentionDoc("user-a"),
      nextPublishedContent: mentionDoc("user-b"),
    });

    expect(createNotification).toHaveBeenCalledTimes(1);
    const call = createNotification.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(call.recipientUserId).toBe("user-b");
    expect(call.deduplicationKey).toContain("ver-2");
    expect(call.href).toContain("/dashboard/dokumentation/p/page-1");
  });

  it("does not notify when recipient lacks page read access", async () => {
    const { resolvePageEffectiveAccess } = await import(
      "@/lib/tenant-documentation/page-access-service"
    );
  const { accessLevelPermits } = await import("@/lib/tenant-documentation/authorization");
    vi.mocked(resolvePageEffectiveAccess).mockResolvedValueOnce(null);
    vi.mocked(accessLevelPermits).mockReturnValueOnce(false);

    await emitTenantDocumentationMentionNotifications({
      tenantId: "t1",
      pageId: "page-1",
      pageTitle: "Protokoll",
      publishedVersionId: "ver-3",
      actorUserId: "user-a",
      actorDisplayName: "Publisher",
      previousPublishedContent: null,
      nextPublishedContent: mentionDoc("user-c"),
    });

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("skips self-mention", async () => {
    await emitTenantDocumentationMentionNotifications({
      tenantId: "t1",
      pageId: "page-1",
      pageTitle: "Protokoll",
      publishedVersionId: "ver-1",
      actorUserId: "user-a",
      actorDisplayName: "Publisher",
      previousPublishedContent: null,
      nextPublishedContent: mentionDoc("user-a"),
    });
    expect(createNotification).not.toHaveBeenCalled();
  });
});