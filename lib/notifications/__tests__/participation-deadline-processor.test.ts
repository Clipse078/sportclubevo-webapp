import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotificationType as NotificationTypeEnum } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn() },
  person: { findMany: vi.fn() },
  transaction: vi.fn(),
  getUserIdsAuthorizedToRespondForPerson: vi.fn(),
  loadEffectivePreferencesForUsers: vi.fn(),
  createNotificationIdempotent: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    playerSquadMember: { findMany: mocks.playerSquadMember.findMany },
    participationResponse: { findMany: mocks.participationResponse.findMany },
    person: { findMany: mocks.person.findMany },
    $transaction: mocks.transaction,
    trainingSession: { findMany: vi.fn().mockResolvedValue([]) },
    event: { findMany: vi.fn().mockResolvedValue([]) },
    tenant: { findUnique: vi.fn() },
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

describe("participation-deadline-processor", () => {
  const due = new Date("2026-09-25T16:00:00.000Z");
  const start = new Date("2026-09-26T18:00:00.000Z");
  const r1 = new Date("2026-09-24T08:00:00.000Z");
  const now = new Date("2026-09-24T12:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.playerSquadMember.findMany.mockResolvedValue([{ personId: "person-1" }]);
    mocks.participationResponse.findMany.mockResolvedValue([]);
    mocks.person.findMany.mockResolvedValue([
      { id: "person-1", firstName: "Max", lastName: "Muster", displayName: null },
    ]);
    mocks.getUserIdsAuthorizedToRespondForPerson.mockResolvedValue(["user-1"]);
    mocks.loadEffectivePreferencesForUsers.mockResolvedValue(
      new Map([["user-1", { inApp: true, email: true }]]),
    );
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
    mocks.createNotificationIdempotent.mockResolvedValue({ kind: "CREATED" });
  });

  it("emits PARTICIPATION_REMINDER stage 1 once when R1 due and deadline future", async () => {
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    const result = await emitParticipationDeadlineNotificationsForTarget({
      tenantId: "tenant-1",
      now,
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: {
        kind: "TRAINING",
        entityId: "session-1",
        teamSeasonId: "ts-1",
        title: "Training",
        participationResponseDueAt: due,
        participationReminder1At: r1,
        participationReminder2At: null,
        eventStartAt: start,
      },
    });
    expect(result.reminderCreated).toBe(1);
    expect(result.overdueCreated).toBe(0);
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: NotificationTypeEnum.PARTICIPATION_REMINDER,
        recipientUserId: "user-1",
      }),
    );
  });

  it("does not emit stale R1 when deadline already passed", async () => {
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    const pastDue = new Date("2026-09-23T16:00:00.000Z");
    const result = await emitParticipationDeadlineNotificationsForTarget({
      tenantId: "tenant-1",
      now: new Date("2026-09-24T12:00:00.000Z"),
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: {
        kind: "MATCH",
        entityId: "match-1",
        teamSeasonId: "ts-1",
        title: "Spiel",
        participationResponseDueAt: pastDue,
        participationReminder1At: r1,
        participationReminder2At: null,
        eventStartAt: start,
      },
    });
    expect(result.reminderCreated).toBe(0);
    expect(result.overdueCreated).toBe(1);
  });

  it("skips reminders when response is resolved YES", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "person-1", status: "YES" },
    ]);
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    const result = await emitParticipationDeadlineNotificationsForTarget({
      tenantId: "tenant-1",
      now,
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: {
        kind: "TRAINING",
        entityId: "session-1",
        teamSeasonId: "ts-1",
        title: "Training",
        participationResponseDueAt: due,
        participationReminder1At: r1,
        participationReminder2At: null,
        eventStartAt: start,
      },
    });
    expect(result.reminderCreated).toBe(0);
    expect(result.overdueCreated).toBe(0);
  });

  it("emits PARTICIPATION_OVERDUE without mutating participation response", async () => {
    const { emitParticipationDeadlineNotificationsForTarget } = await import(
      "../participation-deadline-processor"
    );
    await emitParticipationDeadlineNotificationsForTarget({
      tenantId: "tenant-1",
      now: new Date("2026-09-26T00:00:00.000Z"),
      locale: "de-CH",
      timeZone: "Europe/Zurich",
      target: {
        kind: "TOURNAMENT",
        entityId: "t-1",
        teamSeasonId: "ts-1",
        title: "Turnier",
        participationResponseDueAt: due,
        participationReminder1At: null,
        participationReminder2At: null,
        eventStartAt: start,
      },
    });
    expect(mocks.createNotificationIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: NotificationTypeEnum.PARTICIPATION_OVERDUE }),
    );
    expect(mocks.participationResponse.findMany).toHaveBeenCalled();
  });
});
