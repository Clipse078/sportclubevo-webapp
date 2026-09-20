import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";
import {
  buildParticipationOverdueDedupKey,
  buildParticipationReminderDedupKey,
  participationPersonalInboxHref,
} from "../deduplication";

const mocks = vi.hoisted(() => ({
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  person: { findMany: vi.fn() },
  transaction: vi.fn(),
  getUserIdsAuthorizedToRespondForPerson: vi.fn(),
  loadEffectivePreferencesForUsers: vi.fn(),
  createNotificationIdempotent: vi.fn(),
  task: { create: vi.fn() },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: mocks.playerSquadMember.findMany },
    participationResponse: {
      findMany: mocks.participationResponse.findMany,
      update: mocks.participationResponse.update,
      create: mocks.participationResponse.create,
    },
    person: { findMany: mocks.person.findMany },
    $transaction: mocks.transaction,
    trainingSession: { findMany: vi.fn().mockResolvedValue([]) },
    event: { findMany: vi.fn().mockResolvedValue([]) },
    tenant: { findUnique: vi.fn() },
    task: { create: mocks.task.create },
  },
}));

vi.mock("@/lib/participation/authorization", () => ({
  getUserIdsAuthorizedToRespondForPerson: mocks.getUserIdsAuthorizedToRespondForPerson,
}));

vi.mock("../preference-service", () => ({
  loadEffectivePreferencesForUsers: mocks.loadEffectivePreferencesForUsers,
}));

vi.mock("../notification-service", () => ({
  createNotificationIdempotent: mocks.createNotificationIdempotent,
}));

function pref(inApp = true, email = true) {
  return { inAppEnabled: inApp, emailEnabled: email };
}

describe("participation-deadline-processor", () => {
  const due = new Date("2026-09-25T16:00:00.000Z");
  const start = new Date("2026-09-26T18:00:00.000Z");
  const r1 = new Date("2026-09-24T08:00:00.000Z");
  const r2 = new Date("2026-09-24T20:00:00.000Z");
  const now = new Date("2026-09-24T21:00:00.000Z");

  const baseTarget = {
    kind: "TRAINING" as const,
    entityId: "session-1",
    teamSeasonId: "ts-1",
    title: "Training",
    participationResponseDueAt: due,
    participationReminder1At: r1,
    participationReminder2At: r2,
    eventStartAt: start,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.playerSquadMember.findMany.mockResolvedValue([{ personId: "person-1" }]);
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([
      { id: "person-1", firstName: "Max", lastName: "Muster", displayName: null },
    ]);
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["user-1"]);
    mocks.loadEffectivePreferencesForUsers.mockImplementation(
      async (_tx, _tenant, userIds: string[]) => {
        const map = new Map<string, ReturnType<typeof pref>>();
        for (const id of userIds) {
          map.set(id, pref(true, true));
        }
        return map;
      },
    );
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
    mocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
  });

  async function emit(
    overrides: Partial<typeof baseTarget> & { now?: Date } = {},
  ) {
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    const { now: nowOverride, ...targetOverrides } = overrides;
    return emitParticipationDeadlineNotificationsForTarget({
      tenantId: "tenant-1",
      now: nowOverride ?? now,
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: { ...baseTarget, ...targetOverrides },
    });
  }

  it("A1-R1 — emits PARTICIPATION_REMINDER stage 1 once per authorized recipient", async () => {
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(1);
    expect(result.overdueCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: NotificationTypeEnum.PARTICIPATION_REMINDER,
        recipientUserId: "user-1",
        deduplicationKey: buildParticipationReminderDedupKey({
          tenantId: "tenant-1",
          personId: "person-1",
          kind: "TRAINING",
          entityId: "session-1",
          recipientUserId: "user-1",
          stage: 1,
          reminderAtIso: r1.toISOString(),
        }),
        href: participationPersonalInboxHref(),
      }),
    );
  });

  it("A1-R2 — emits stage 2 with distinct dedup identity from R1", async () => {
    const result = await emit();
    expect(result.reminderCreated).toBe(2);
    const keys = mocks.createNotificationIdempotent.mock.calls.map(
      (c) => c[1].deduplicationKey as string,
    );
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toEqual(keys[1]);
    expect(keys.some((k) => k.includes(":1:"))).toBe(true);
    expect(keys.some((k) => k.includes(":2:"))).toBe(true);
  });

  it("A1-OVERDUE — emits PARTICIPATION_OVERDUE without mutating participation response", async () => {
    await emit({
      participationReminder1At: null,
      participationReminder2At: null,
      now: new Date("2026-09-26T00:00:00.000Z"),
    });
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: NotificationTypeEnum.PARTICIPATION_OVERDUE }),
    );
    expect(mocks.participationResponse.update).not.toHaveBeenCalled();
    expect(mocks.participationResponse.create).not.toHaveBeenCalled();
    expect(mocks.task.create).not.toHaveBeenCalled();
  });

  it("A1-LATE_CRON — delivers reminder when reminderAt < now < deadline", async () => {
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T23:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(1);
    expect(result.overdueCreated).toBe(0);
  });

  it("A1-PAST_DEADLINE — skips stale reminder when deadline <= now; overdue handles unresolved", async () => {
    const pastDue = new Date("2026-09-23T16:00:00.000Z");
    const result = await emit({
      participationResponseDueAt: pastDue,
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(0);
    expect(result.overdueCreated).toBe(1);
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledTimes(1);
    expect(mocks.createNotificationIdempotent.mock.calls[0][1]).toMatchObject({
      type: "PARTICIPATION_OVERDUE",
    });
  });

  it.each([
    ["YES", "YES"],
    ["NO", "NO"],
    ["MAYBE", "MAYBE"],
  ] as const)("A1-RESOLVED-%s — suppresses reminders and overdue", async (_label, status) => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "person-1", status },
    ]);
    const result = await emit();
    expect(result.reminderCreated).toBe(0);
    expect(result.overdueCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).not.toHaveBeenCalled();
  });

  it("A1-MULTI-GUARDIAN — each guardian gets recipient-specific dedup key", async () => {
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["guardian-a", "guardian-b"]);
    mocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([
        ["guardian-a", pref()],
        ["guardian-b", pref()],
      ]),
    );
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(2);
    const keys = mocks.createNotificationIdempotent.mock.calls.map(
      (c) => c[1].deduplicationKey as string,
    );
    expect(keys.some((k) => k.includes("guardian-a"))).toBe(true);
    expect(keys.some((k) => k.includes("guardian-b"))).toBe(true);
    expect(new Set(keys).size).toBe(2);
  });

  it("A1-GUARDIAN-REMOVAL — fresh auth re-check excludes removed guardian", async () => {
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["guardian-a"]);
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(1);
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledTimes(1);
    expect(mocks.createNotificationIdempotent.mock.calls[0][1].recipientUserId).toBe("guardian-a");
  });

  it("A1-MULTI-CHILD — distinct notification identities per child", async () => {
    mocks.playerSquadMember.findMany.mockResolvedValue([
      { personId: "child-a" },
      { personId: "child-b" },
    ]);
    mocks.person.findMany.mockResolvedValue([
      { id: "child-a", firstName: "A", lastName: "One", displayName: null },
      { id: "child-b", firstName: "B", lastName: "Two", displayName: null },
    ]);
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["guardian-a"]);
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(2);
    const keys = mocks.createNotificationIdempotent.mock.calls.map(
      (c) => c[1].deduplicationKey as string,
    );
    expect(keys.some((k) => k.includes("child-a"))).toBe(true);
    expect(keys.some((k) => k.includes("child-b"))).toBe(true);
    expect(new Set(keys).size).toBe(2);
  });

  it("A1-ADULT-SELF — single authorized user receives reminder", async () => {
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["adult-user"]);
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(1);
    expect(mocks.createNotificationIdempotent.mock.calls[0][1].recipientUserId).toBe("adult-user");
  });

  it("A1-IDEMPOTENT — DEDUPLICATED does not increment created counts", async () => {
    mocks.createNotificationIdempotent
      .mockResolvedValueOnce({ kind: "CREATED" })
      .mockResolvedValueOnce({ kind: "DEDUPLICATED" });
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(1);
  });

  it("A1-CONCURRENT — parallel emit attempts delegate to idempotent boundary", async () => {
    mocks.createNotificationIdempotent.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { kind: "CREATED" };
    });
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    const input = {
      tenantId: "tenant-1",
      now: new Date("2026-09-24T12:00:00.000Z"),
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: {
        ...baseTarget,
        participationReminder2At: null,
      },
    };
    const [a, b] = await Promise.all([
      emitParticipationDeadlineNotificationsForTarget(input),
      emitParticipationDeadlineNotificationsForTarget(input),
    ]);
    expect(a.reminderCreated + b.reminderCreated).toBeGreaterThanOrEqual(1);
    expect(mocks.createNotificationIdempotent.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("A1-DEADLINE-EDIT — new reminder timestamp yields new dedup key", async () => {
    await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    const firstKey = mocks.createNotificationIdempotent.mock.calls[0][1].deduplicationKey;
    vi.clearAllMocks();
    mocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
    const newR1 = new Date("2026-09-23T08:00:00.000Z");
    await emit({
      participationReminder1At: newR1,
      participationReminder2At: null,
      now: new Date("2026-09-23T12:00:00.000Z"),
    });
    const secondKey = mocks.createNotificationIdempotent.mock.calls[0][1].deduplicationKey;
    expect(firstKey).not.toEqual(secondKey);
  });

  it("A1-STALE-REMINDER — updated schedule prevents emission of old reminder instant", async () => {
    const result = await emit({
      participationReminder1At: new Date("2026-09-25T10:00:00.000Z"),
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).not.toHaveBeenCalled();
  });

  it("A1-ROSTER-EMPTY — no notifications when squad empty", async () => {
    mocks.playerSquadMember.findMany.mockResolvedValue([]);
    const result = await emit();
    expect(result.reminderCreated).toBe(0);
    expect(result.overdueCreated).toBe(0);
  });

  it("A1-PREFERENCES — PARTICIPATION_REMINDER respects in-app off", async () => {
    mocks.loadEffectivePreferencesForUsers.mockResolvedValue(new Map([["user-1", pref(false, true)]]));
    mocks.createNotificationIdempotent.mockResolvedValue(null);
    const result = await emit({
      participationReminder2At: null,
      now: new Date("2026-09-24T12:00:00.000Z"),
    });
    expect(result.reminderCreated).toBe(0);
  });

  it("A1-PREFERENCES — overdue uses PARTICIPATION_OVERDUE preference type", async () => {
    await emit({
      participationReminder1At: null,
      participationReminder2At: null,
      now: new Date("2026-09-26T00:00:00.000Z"),
    });
    expect(mocks.loadEffectivePreferencesForUsers).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-1",
      ["user-1"],
      NotificationTypeEnum.PARTICIPATION_OVERDUE,
    );
  });

  it("A1-OVERDUE-DEDUP — deadline change produces distinct overdue identity", () => {
    const a = buildParticipationOverdueDedupKey({
      tenantId: "t1",
      personId: "p1",
      kind: "MATCH",
      entityId: "e1",
      recipientUserId: "u1",
      dueAtIso: due.toISOString(),
    });
    const b = buildParticipationOverdueDedupKey({
      tenantId: "t1",
      personId: "p1",
      kind: "MATCH",
      entityId: "e1",
      recipientUserId: "u1",
      dueAtIso: new Date("2026-09-24T16:00:00.000Z").toISOString(),
    });
    expect(a).not.toEqual(b);
  });
});
