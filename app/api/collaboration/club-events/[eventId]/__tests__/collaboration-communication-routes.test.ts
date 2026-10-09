import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
  getActiveTenant: vi.fn(),
  prepareClubEventActivityChangeCommunicationDraft: vi.fn(),
  publishPreparedClubEventActivityChangeCommunication: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: (...args: unknown[]) => mocks.requireApiAnyPermission(...args),
}));

vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: (...args: unknown[]) => mocks.getActiveTenant(...args),
}));

vi.mock("@/lib/collaboration/contextual-communication-service", () => ({
  prepareClubEventActivityChangeCommunicationDraft: (...args: unknown[]) =>
    mocks.prepareClubEventActivityChangeCommunicationDraft(...args),
  publishPreparedClubEventActivityChangeCommunication: (...args: unknown[]) =>
    mocks.publishPreparedClubEventActivityChangeCommunication(...args),
}));

const EVENT_ID = "evt-club-1";

const changeSet = {
  domain: "CLUB_EVENT" as const,
  activityId: EVENT_ID,
  fingerprint: "fp-1",
  entries: [],
};

const { POST: preparePost } = await import("../prepare-communication/route");
const { POST: publishPost } = await import("../publish-communication/route");

describe("club event collaboration prepare-communication route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", effectiveUserId: "u1" } },
    });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
  });

  it("rejects missing changeSet", async () => {
    const res = await preparePost(
      new NextRequest(`http://localhost/api/collaboration/club-events/${EVENT_ID}/prepare-communication`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ eventId: EVENT_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("prepares draft when authorized", async () => {
    mocks.prepareClubEventActivityChangeCommunicationDraft.mockResolvedValue({
      draftId: "draft-1",
      teamId: null,
      communicationScope: "CLUB",
      redirectPath: "/dashboard/kommunikation/club?communicationId=draft-1",
      reusedExistingDraft: false,
      subject: "Änderung: GV",
      bodyText: "body",
      audienceLabel: "Team F2",
      recipientCount: 0,
      canDispatch: false,
    });

    const res = await preparePost(
      new NextRequest(`http://localhost/api/collaboration/club-events/${EVENT_ID}/prepare-communication`, {
        method: "POST",
        body: JSON.stringify({ changeSet }),
      }),
      { params: Promise.resolve({ eventId: EVENT_ID }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draftId).toBe("draft-1");
    expect(json.communicationScope).toBe("CLUB");
  });
});

describe("club event collaboration publish-communication route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiAnyPermission.mockResolvedValue({
      ok: true,
      session: { user: { id: "u1", effectiveUserId: "u1" } },
    });
    mocks.getActiveTenant.mockResolvedValue({ id: "tenant-1", key: "fca" });
  });

  it("requires draftId", async () => {
    const res = await publishPost(
      new NextRequest(`http://localhost/api/collaboration/club-events/${EVENT_ID}/publish-communication`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ eventId: EVENT_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("publishes club-scoped draft", async () => {
    mocks.publishPreparedClubEventActivityChangeCommunication.mockResolvedValue({
      communicationId: "comm-1",
      recipientCount: 2,
    });

    const res = await publishPost(
      new NextRequest(`http://localhost/api/collaboration/club-events/${EVENT_ID}/publish-communication`, {
        method: "POST",
        body: JSON.stringify({
          draftId: "draft-1",
          communicationScope: "CLUB",
          bodyText: "Hi",
        }),
      }),
      { params: Promise.resolve({ eventId: EVENT_ID }) },
    );
    expect(res.status).toBe(200);
    expect(mocks.publishPreparedClubEventActivityChangeCommunication).toHaveBeenCalled();
  });
});
