import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimTeamRequestSlot,
  closeTeamRequest,
  getRequestAggregateStatus,
  listRequestClaimantDetail,
  listRequestNonRespondedSnapshotIds,
  listRequestSlotsWithOpenCapacity,
  listRequestsWithOpenCapacity,
  sendTeamRequestCommunication,
  unclaimTeamRequestSlot,
} from "@/lib/communication/team/team-request-communication-service";
import {
  defaultNotificationTitleForKind,
  notificationTypeForCommunicationKind,
} from "@/lib/communication/team/team-communication-notification-kinds";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

const mocks = vi.hoisted(() => ({
  platformCommunication: { findFirst: vi.fn() },
  platformCommunicationRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationRequestSlot: { findMany: vi.fn() },
  platformCommunicationRequestClaim: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    groupBy: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  event: { findFirst: vi.fn() },
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  logAction: vi.fn(),
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: mocks.platformCommunication,
    platformCommunicationRequest: mocks.platformCommunicationRequest,
    platformCommunicationRequestSlot: mocks.platformCommunicationRequestSlot,
    platformCommunicationRequestClaim: mocks.platformCommunicationRequestClaim,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    event: mocks.event,
    $transaction: mocks.$transaction,
    $queryRaw: mocks.$queryRaw,
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

function mockPublishedRequest(overrides?: {
  lifecycle?: "OPEN" | "CLOSED";
  deadlineAt?: Date | null;
  slots?: Array<{ id: string; requiredCapacity?: number }>;
}) {
  mocks.platformCommunication.findFirst.mockResolvedValue({
    id: "comm-req-1",
    kind: "REQUEST",
    conversation: { teamId: "team-1" },
    request: {
      id: "req-1",
      lifecycle: overrides?.lifecycle ?? "OPEN",
      deadlineAt: overrides?.deadlineAt ?? null,
      slots: overrides?.slots ?? [{ id: "slot-1", requiredCapacity: 1 }],
    },
  });
}

describe("SCE-COMM-08 requests & Helfereinsätze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-req-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-req-1", recipientCount: 8 });
    mocks.logAction.mockResolvedValue(undefined);
    mocks.platformCommunicationRequest.create.mockResolvedValue({ id: "req-1" });
    mocks.event.findFirst.mockResolvedValue(null);
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mocks));
  });

  it("maps request notification type", () => {
    expect(notificationTypeForCommunicationKind("REQUEST")).toBe("TEAM_REQUEST_PUBLISHED");
    expect(defaultNotificationTitleForKind("REQUEST", null)).toBe("Team-Anfrage");
  });

  it("creates simple request with one slot", async () => {
    await sendTeamRequestCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      title: "Leibchen waschen",
      slots: [{ label: "Waschtag", requiredCapacity: 1 }],
      audiencePreset: "ALL",
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "REQUEST", audiencePreset: "ALL" }),
    );
    expect(mocks.publishTeamCommunication).toHaveBeenCalled();
  });

  it("creates multi-slot Helfereinsatz", async () => {
    await sendTeamRequestCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      title: "Heimturnier",
      slots: [
        { label: "Aufbau", requiredCapacity: 2 },
        { label: "Grill", requiredCapacity: 3 },
      ],
    });
    expect(mocks.platformCommunicationRequest.create).toHaveBeenCalled();
  });

  it("rejects empty slots", async () => {
    await expect(
      sendTeamRequestCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        title: "Test",
        slots: [],
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);
  });

  it("rejects invalid capacity", async () => {
    await expect(
      sendTeamRequestCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        title: "Test",
        slots: [{ label: "X", requiredCapacity: 0 }],
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);
  });

  it("rejects cross-team event reference", async () => {
    mocks.event.findFirst.mockResolvedValue({ id: "event-1", teamId: "other-team" });
    await expect(
      sendTeamRequestCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        title: "Test",
        slots: [{ label: "Slot" }],
        eventId: "event-1",
      }),
    ).rejects.toThrow(/event not accessible/);
  });

  it("rejects claim from non-recipient", async () => {
    mockPublishedRequest();
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([]);

    await expect(
      claimTeamRequestSlot({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-req-1",
        slotId: "slot-1",
        actorUserId: "outsider",
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
  });

  it("claims slot and advances engagement to RESPONDED", async () => {
    mockPublishedRequest({ slots: [{ id: "slot-1", requiredCapacity: 3 }] });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      {
        id: "snap-1",
        engagement: "READ",
        readAt: new Date("2026-01-01T10:00:00Z"),
        acknowledgedAt: null,
        viaGuardianSubstitution: false,
      },
    ]);

    mocks.$queryRaw.mockResolvedValue([{ id: "slot-1", requestId: "req-1", requiredCapacity: 3 }]);
    mocks.platformCommunicationRequestClaim.findFirst.mockResolvedValue(null);
    mocks.platformCommunicationRequestClaim.count.mockResolvedValue(1);
    mocks.platformCommunicationRequestClaim.create.mockResolvedValue({ id: "claim-1" });

    await claimTeamRequestSlot({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      slotId: "slot-1",
      actorUserId: "user-player",
    });

    expect(mocks.platformCommunicationRequestClaim.create).toHaveBeenCalled();
    expect(mocks.platformCommunicationRecipientSnapshot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ engagement: "RESPONDED" }) }),
    );
  });

  it("is idempotent when same recipient claims same slot twice", async () => {
    mockPublishedRequest();
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      {
        id: "snap-1",
        engagement: "RESPONDED",
        readAt: new Date(),
        acknowledgedAt: null,
        viaGuardianSubstitution: false,
      },
    ]);
    mocks.$queryRaw.mockResolvedValue([{ id: "slot-1", requestId: "req-1", requiredCapacity: 1 }]);
    mocks.platformCommunicationRequestClaim.findFirst.mockResolvedValue({
      id: "claim-existing",
      recipientSnapshotId: "snap-1",
    });

    await claimTeamRequestSlot({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      slotId: "slot-1",
      actorUserId: "user-player",
    });

    expect(mocks.platformCommunicationRequestClaim.create).not.toHaveBeenCalled();
  });

  it("rejects claim when slot is full", async () => {
    mockPublishedRequest();
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      {
        id: "snap-2",
        engagement: "PENDING",
        readAt: null,
        acknowledgedAt: null,
        viaGuardianSubstitution: false,
      },
    ]);
    mocks.$queryRaw.mockResolvedValue([{ id: "slot-1", requestId: "req-1", requiredCapacity: 1 }]);
    mocks.platformCommunicationRequestClaim.findFirst.mockResolvedValue(null);
    mocks.platformCommunicationRequestClaim.count.mockResolvedValue(1);

    await expect(
      claimTeamRequestSlot({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-req-1",
        slotId: "slot-1",
        actorUserId: "user-player-2",
      }),
    ).rejects.toThrow(/full/);
  });

  it("rejects claim on closed request", async () => {
    mockPublishedRequest({ lifecycle: "CLOSED" });
    await expect(
      claimTeamRequestSlot({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-req-1",
        slotId: "slot-1",
        actorUserId: "user-player",
      }),
    ).rejects.toThrow(/closed/);
  });

  it("rejects claim after deadline", async () => {
    mockPublishedRequest({
      deadlineAt: new Date("2020-01-01T00:00:00Z"),
    });
    await expect(
      claimTeamRequestSlot({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-req-1",
        slotId: "slot-1",
        actorUserId: "user-player",
      }),
    ).rejects.toThrow(/closed/);
  });

  it("unclaims own claim only", async () => {
    mockPublishedRequest();
    mocks.platformCommunicationRequestClaim.deleteMany.mockResolvedValue({ count: 1 });

    await unclaimTeamRequestSlot({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      slotId: "slot-1",
      actorUserId: "user-player",
    });

    expect(mocks.platformCommunicationRequestClaim.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipientSnapshot: expect.objectContaining({ deliveryUserId: "user-player" }),
        }),
      }),
    );
  });

  it("closes request for authorized organizer", async () => {
    mockPublishedRequest();
    await closeTeamRequest({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      actorUserId: "user-trainer",
      viewerCanSend: true,
    });
    expect(mocks.platformCommunicationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lifecycle: "CLOSED" }) }),
    );
  });

  it("computes aggregate capacity", async () => {
    mocks.platformCommunicationRequest.findFirst.mockResolvedValue({
      id: "req-1",
      slots: [
        {
          id: "slot-a",
          sortOrder: 0,
          label: "A",
          description: null,
          requiredCapacity: 2,
          startAt: null,
          endAt: null,
        },
        {
          id: "slot-b",
          sortOrder: 1,
          label: "B",
          description: null,
          requiredCapacity: 3,
          startAt: null,
          endAt: null,
        },
      ],
    });
    mocks.platformCommunicationRequestClaim.groupBy.mockResolvedValue([
      { slotId: "slot-a", _count: { _all: 2 } },
      { slotId: "slot-b", _count: { _all: 1 } },
    ]);

    const status = await getRequestAggregateStatus({ tenantId: "tenant-a", requestId: "req-1" });
    expect(status.totalRequired).toBe(5);
    expect(status.totalClaimed).toBe(3);
    expect(status.totalRemaining).toBe(2);
    expect(status.fullSlotCount).toBe(1);
    expect(status.openSlotCount).toBe(1);
  });

  it("restricts claimant detail to organizers", async () => {
    mockPublishedRequest();
    await expect(
      listRequestClaimantDetail({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-req-1",
        viewerCanSend: false,
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
  });

  it("exposes non-responder snapshot seam", async () => {
    mocks.platformCommunicationRequest.findFirst.mockResolvedValue({ id: "req-1" });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { id: "snap-1", requestClaims: [{ id: "c1" }] },
      { id: "snap-2", requestClaims: [] },
    ]);

    const ids = await listRequestNonRespondedSnapshotIds({
      tenantId: "tenant-a",
      communicationId: "comm-req-1",
    });
    expect(ids).toEqual(["snap-2"]);
  });

  it("exposes open-capacity seams", async () => {
    mocks.platformCommunicationRequest.findFirst.mockResolvedValue({
      id: "req-1",
      lifecycle: "OPEN",
      deadlineAt: null,
      slots: [{ id: "slot-1", requiredCapacity: 2 }],
    });
    mocks.platformCommunicationRequestClaim.groupBy.mockResolvedValue([
      { slotId: "slot-1", _count: { _all: 1 } },
    ]);

    const openSlots = await listRequestSlotsWithOpenCapacity({
      tenantId: "tenant-a",
      communicationId: "comm-req-1",
    });
    expect(openSlots).toEqual(["slot-1"]);

    mocks.platformCommunicationRequest.findMany.mockResolvedValue([
      {
        communicationId: "comm-req-1",
        lifecycle: "OPEN",
        deadlineAt: null,
        slots: [{ id: "slot-1", requiredCapacity: 2 }],
      },
    ]);
    const openRequests = await listRequestsWithOpenCapacity({
      tenantId: "tenant-a",
      communicationIds: ["comm-req-1"],
    });
    expect(openRequests).toEqual(["comm-req-1"]);
  });

  it("locks slot row FOR UPDATE during claim (concurrency)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/communication/team/team-request-communication-service.ts"),
      "utf8",
    );
    expect(src).toMatch(/claimTeamRequestSlot[\s\S]*FOR UPDATE/);
  });

  it("serializes concurrent final-slot claims so only one succeeds", async () => {
    mockPublishedRequest();
    let claimCount = 0;
    const lock = { queue: Promise.resolve() };

    mocks.platformCommunicationRecipientSnapshot.findMany.mockImplementation(async ({ where }) => {
      const userId = where.deliveryUserId;
      return [
        {
          id: userId === "user-a" ? "snap-a" : "snap-b",
          engagement: "PENDING",
          readAt: null,
          acknowledgedAt: null,
          viaGuardianSubstitution: false,
        },
      ];
    });

    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const run = lock.queue.then(async () => {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([
            { id: "slot-1", requestId: "req-1", requiredCapacity: 1 },
          ]),
          platformCommunicationRequestClaim: {
            findFirst: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockImplementation(async () => claimCount),
            create: vi.fn().mockImplementation(async () => {
              if (claimCount >= 1) {
                throw new TeamCommunicationValidationError("slot is full");
              }
              claimCount += 1;
              return { id: `claim-${claimCount}` };
            }),
          },
          platformCommunicationRecipientSnapshot: { update: vi.fn() },
        };
        return fn(tx);
      });
      lock.queue = run.catch(() => undefined);
      return run;
    });

    const first = claimTeamRequestSlot({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      slotId: "slot-1",
      actorUserId: "user-a",
    });
    const second = claimTeamRequestSlot({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-req-1",
      slotId: "slot-1",
      actorUserId: "user-b",
    });

    const results = await Promise.allSettled([first, second]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(claimCount).toBe(1);
  });
});
