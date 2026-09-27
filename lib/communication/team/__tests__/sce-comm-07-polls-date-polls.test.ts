import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeTeamPoll,
  createEventFromDatePollCommunication,
  getPollAggregateResults,
  listPollNonRespondedSnapshotIds,
  selectDatePollWinner,
  sendTeamPollCommunication,
  submitTeamPollResponse,
} from "@/lib/communication/team/team-poll-communication-service";
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
  platformCommunicationPoll: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  platformCommunicationPollOption: { findMany: vi.fn() },
  platformCommunicationPollResponse: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  platformCommunicationRecipientSnapshot: {
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  createOtherEventFromDatePoll: vi.fn(),
  logAction: vi.fn(),
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: mocks.platformCommunication,
    platformCommunicationPoll: mocks.platformCommunicationPoll,
    platformCommunicationPollOption: mocks.platformCommunicationPollOption,
    platformCommunicationPollResponse: mocks.platformCommunicationPollResponse,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    $transaction: mocks.$transaction,
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
}));

vi.mock("@/lib/communication/team/date-poll-event-conversion", () => ({
  createOtherEventFromDatePoll: (...args: unknown[]) => mocks.createOtherEventFromDatePoll(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

describe("SCE-COMM-07 polls & date polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-poll-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-poll-1", recipientCount: 12 });
    mocks.logAction.mockResolvedValue(undefined);
    mocks.platformCommunicationPoll.create.mockResolvedValue({ id: "poll-1" });
    mocks.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        platformCommunicationPoll: mocks.platformCommunicationPoll,
        platformCommunicationPollResponse: mocks.platformCommunicationPollResponse,
        platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
      }),
    );
  });

  it("maps poll notification types", () => {
    expect(notificationTypeForCommunicationKind("POLL")).toBe("TEAM_POLL_PUBLISHED");
    expect(notificationTypeForCommunicationKind("DATE_POLL")).toBe("TEAM_DATE_POLL_PUBLISHED");
    expect(defaultNotificationTitleForKind("POLL", null)).toBe("Team-Umfrage");
  });

  it("creates poll with minimum options and audience preset", async () => {
    await sendTeamPollCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      kind: "POLL",
      question: "Which tournament?",
      options: [{ label: "Basel" }, { label: "Zürich" }],
      audiencePreset: "PLAYERS",
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "POLL", audiencePreset: "PLAYERS" }),
    );
    expect(mocks.publishTeamCommunication).toHaveBeenCalled();
  });

  it("rejects invalid poll options", async () => {
    await expect(
      sendTeamPollCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-trainer",
        kind: "POLL",
        question: "Q?",
        options: [{ label: "Only one" }],
      }),
    ).rejects.toThrow(TeamCommunicationValidationError);
  });

  it("creates date poll with structured timestamps", async () => {
    await sendTeamPollCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-trainer",
      kind: "DATE_POLL",
      question: "When meet?",
      options: [
        { startAt: "2026-10-13T16:30:00.000Z" },
        { startAt: "2026-10-14T17:00:00.000Z", endAt: "2026-10-14T19:00:00.000Z" },
      ],
    });
    expect(mocks.platformCommunicationPoll.create).toHaveBeenCalled();
  });

  it("rejects response from non-recipient", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-poll-1",
      kind: "POLL",
      conversation: { teamId: "team-1" },
      poll: {
        id: "poll-1",
        lifecycle: "OPEN",
        deadlineAt: null,
        mode: "SINGLE",
        options: [{ id: "opt-1" }, { id: "opt-2" }],
      },
    });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([]);

    await expect(
      submitTeamPollResponse({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-poll-1",
        actorUserId: "outsider",
        optionIds: ["opt-1"],
      }),
    ).rejects.toThrow(TeamCommunicationForbiddenError);
  });

  it("enforces single-choice on submit", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-poll-1",
      kind: "POLL",
      conversation: { teamId: "team-1" },
      poll: {
        id: "poll-1",
        lifecycle: "OPEN",
        deadlineAt: null,
        mode: "SINGLE",
        options: [{ id: "opt-1" }, { id: "opt-2" }],
      },
    });

    await expect(
      submitTeamPollResponse({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "comm-poll-1",
        actorUserId: "user-player",
        optionIds: ["opt-1", "opt-2"],
      }),
    ).rejects.toThrow(/single-choice/);
  });

  it("computes aggregate results with multiple-choice semantics", async () => {
    mocks.platformCommunicationPoll.findFirst.mockResolvedValue({
      id: "poll-1",
      communicationId: "comm-poll-1",
      options: [
        { id: "opt-1", sortOrder: 0, label: "A", startAt: null, endAt: null },
        { id: "opt-2", sortOrder: 1, label: "B", startAt: null, endAt: null },
      ],
    });
    mocks.platformCommunicationRecipientSnapshot.count.mockResolvedValue(10);
    mocks.platformCommunicationPollResponse.groupBy
      .mockResolvedValueOnce([{ recipientSnapshotId: "snap-1" }, { recipientSnapshotId: "snap-2" }])
      .mockResolvedValueOnce([
        { optionId: "opt-1", _count: { _all: 2 } },
        { optionId: "opt-2", _count: { _all: 1 } },
      ]);

    const results = await getPollAggregateResults({ tenantId: "tenant-a", pollId: "poll-1" });
    expect(results.respondedRecipientCount).toBe(2);
    expect(results.totalSelectionCount).toBe(3);
    expect(results.notRespondedCount).toBe(8);
  });

  it("closes poll for authorized sender", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-poll-1",
      kind: "POLL",
      conversation: { teamId: "team-1" },
      poll: { id: "poll-1", lifecycle: "OPEN" },
    });

    await closeTeamPoll({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-poll-1",
      actorUserId: "user-trainer",
      viewerCanSend: true,
    });

    expect(mocks.platformCommunicationPoll.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lifecycle: "CLOSED" }) }),
    );
  });

  it("selects date poll winner without auto tie-break", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-date-1",
      kind: "DATE_POLL",
      conversation: { teamId: "team-1" },
      poll: {
        id: "poll-date-1",
        options: [{ id: "opt-a" }, { id: "opt-b" }],
      },
    });

    await selectDatePollWinner({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-date-1",
      optionId: "opt-b",
      actorUserId: "user-trainer",
      viewerCanSend: true,
    });

    expect(mocks.platformCommunicationPoll.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { selectedOptionId: "opt-b" } }),
    );
  });

  it("creates event idempotently from date poll", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-date-1",
      kind: "DATE_POLL",
      subject: "Elternabend",
      bodyText: "Details",
      conversation: { teamId: "team-1" },
      poll: {
        id: "poll-date-1",
        selectedOptionId: "opt-win",
        createdEventId: null,
        options: [{ id: "opt-win", startAt: new Date("2026-10-13T16:30:00Z"), endAt: null }],
      },
    });
    mocks.createOtherEventFromDatePoll.mockResolvedValue("event-99");

    const first = await createEventFromDatePollCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-date-1",
      actorUserId: "user-trainer",
      viewerCanSend: true,
    });
    expect(first.created).toBe(true);
    expect(mocks.createOtherEventFromDatePoll).toHaveBeenCalledOnce();

    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "comm-date-1",
      kind: "DATE_POLL",
      subject: "Elternabend",
      bodyText: "Details",
      conversation: { teamId: "team-1" },
      poll: {
        id: "poll-date-1",
        selectedOptionId: "opt-win",
        createdEventId: "event-99",
        options: [{ id: "opt-win", startAt: new Date("2026-10-13T16:30:00Z"), endAt: null }],
      },
    });

    const second = await createEventFromDatePollCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "comm-date-1",
      actorUserId: "user-trainer",
      viewerCanSend: true,
    });
    expect(second.created).toBe(false);
    expect(second.eventId).toBe("event-99");
  });

  it("exposes non-responder snapshot seam", async () => {
    mocks.platformCommunicationPoll.findFirst.mockResolvedValue({ id: "poll-1" });
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { id: "snap-1", pollResponses: [{ id: "r1" }] },
      { id: "snap-2", pollResponses: [] },
    ]);

    const ids = await listPollNonRespondedSnapshotIds({
      tenantId: "tenant-a",
      communicationId: "comm-poll-1",
    });
    expect(ids).toEqual(["snap-2"]);
  });
});
