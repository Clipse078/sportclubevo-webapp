import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  previewEventCommunicationRecipients,
  sendEventContextCommunication,
  sendEventNoResponseSmartReminder,
} from "@/lib/communication/event/event-communication-service";
import { listEventParticipationSubjectPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { sendPollNonResponderSmartReminder } from "@/lib/communication/smart-reminders/poll-reminder-service";
import {
  sendRequestNonResponderSmartReminder,
  sendRequestOpenCapacitySmartReminder,
} from "@/lib/communication/smart-reminders/request-reminder-service";
import { dispatchSmartReminderCommunication } from "@/lib/communication/smart-reminders/smart-reminder-dispatch";
import { buildReminderExecutionIdentity } from "@/lib/communication/smart-reminders/reminder-schedule-service";
import { processDueCommunicationReminderSchedules } from "@/lib/communication/smart-reminders/reminder-schedule-processor";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  teamSeason: { findFirst: vi.fn() },
  trainingSession: { findFirst: vi.fn() },
  event: { findFirst: vi.fn() },
  playerSquadMember: { findMany: vi.fn() },
  participationResponse: { findMany: vi.fn() },
  platformCommunication: { findFirst: vi.fn() },
  platformCommunicationPoll: { findFirst: vi.fn() },
  platformCommunicationRequest: { findFirst: vi.fn() },
  platformCommunicationRecipientSnapshot: { findMany: vi.fn() },
  platformCommunicationRequestClaim: { count: vi.fn(), groupBy: vi.fn() },
  communicationReminderExecution: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  communicationReminderSchedule: { findMany: vi.fn(), update: vi.fn() },
  resolveClubEventInviteePersonIds: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  listPollNonRespondedSnapshotIds: vi.fn(),
  listRequestNonRespondedSnapshotIds: vi.fn(),
  listRequestSlotsWithOpenCapacity: vi.fn(),
  resolveTeamCommunicationAuthorization: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: mocks.teamSeason,
    trainingSession: mocks.trainingSession,
    event: mocks.event,
    playerSquadMember: mocks.playerSquadMember,
    participationResponse: mocks.participationResponse,
    platformCommunication: mocks.platformCommunication,
    platformCommunicationPoll: mocks.platformCommunicationPoll,
    platformCommunicationRequest: mocks.platformCommunicationRequest,
    platformCommunicationRecipientSnapshot: mocks.platformCommunicationRecipientSnapshot,
    platformCommunicationRequestClaim: mocks.platformCommunicationRequestClaim,
    communicationReminderExecution: mocks.communicationReminderExecution,
    communicationReminderSchedule: mocks.communicationReminderSchedule,
  },
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  resolveClubEventInviteePersonIds: (...args: unknown[]) =>
    mocks.resolveClubEventInviteePersonIds(...args),
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: (...args: unknown[]) => mocks.resolveCommunicationRecipients(...args),
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: (...args: unknown[]) => mocks.createTeamCommunicationDraft(...args),
  publishTeamCommunication: (...args: unknown[]) => mocks.publishTeamCommunication(...args),
}));

vi.mock("@/lib/communication/team/team-poll-communication-service", () => ({
  listPollNonRespondedSnapshotIds: (...args: unknown[]) =>
    mocks.listPollNonRespondedSnapshotIds(...args),
}));

vi.mock("@/lib/communication/team/team-request-communication-service", () => ({
  listRequestNonRespondedSnapshotIds: (...args: unknown[]) =>
    mocks.listRequestNonRespondedSnapshotIds(...args),
  listRequestSlotsWithOpenCapacity: (...args: unknown[]) =>
    mocks.listRequestSlotsWithOpenCapacity(...args),
}));

vi.mock("@/lib/communication/team/team-communication-authorization", () => ({
  resolveTeamCommunicationAuthorization: (...args: unknown[]) =>
    mocks.resolveTeamCommunicationAuthorization(...args),
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("SCE-COMM-10 event communication & smart reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamSeason.findFirst.mockResolvedValue({ id: "ts-1", teamId: "team-1", seasonId: "season-1" });
    mocks.event.findFirst.mockResolvedValue({
      id: "event-match-1",
      title: "FC Test — Heimspiel",
      startAt: new Date("2026-09-28T18:00:00.000Z"),
      teamId: "team-1",
      teamSeasonId: "ts-1",
      seasonId: "season-1",
    });
    mocks.playerSquadMember.findMany.mockResolvedValue([
      { personId: "p1" },
      { personId: "p2" },
      { personId: "p3" },
    ]);
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "NO" },
    ]);
    mocks.resolveCommunicationRecipients.mockResolvedValue({
      summary: { effectiveCount: 1 },
    });
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "comm-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "comm-1", recipientCount: 1 });
    mocks.communicationReminderExecution.findUnique.mockResolvedValue(null);
    mocks.communicationReminderExecution.create.mockResolvedValue({ id: "exec-1" });
    mocks.platformCommunication.findFirst.mockResolvedValue(null);
    mocks.logAction.mockResolvedValue(undefined);
  });

  it("EVENT_MAYBE_SEMANTICS — MAYBE is its own response, not YES/NO/OPEN preset", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "NO" },
      { personId: "p3", status: "MAYBE" },
    ]);

    const anchor = {
      tenantId: "tenant-a",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      title: "Match",
      startAt: new Date(),
      participationEvent: { eventKind: "MATCH" as const, eventId: "event-match-1" },
      contextEventId: "event-match-1",
      anchorRef: {
        eventKind: "MATCH" as const,
        eventId: "event-match-1",
        teamSeasonId: "ts-1",
        contextEventId: "event-match-1",
      },
    };

    const all = await listEventParticipationSubjectPersonIds({ anchor, preset: "ALL_INVITEES" });
    expect(all).toEqual(["p1", "p2", "p3"]);

    expect(
      await listEventParticipationSubjectPersonIds({ anchor, preset: "ACCEPTED_ONLY" }),
    ).toEqual(["p1"]);
    expect(
      await listEventParticipationSubjectPersonIds({ anchor, preset: "DECLINED_ONLY" }),
    ).toEqual(["p2"]);
    expect(
      await listEventParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" }),
    ).toEqual([]);
  });

  it("maps participation statuses to event presets", async () => {
    const anchor = {
      tenantId: "tenant-a",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      title: "Match",
      startAt: new Date(),
      participationEvent: { eventKind: "MATCH" as const, eventId: "event-match-1" },
      contextEventId: "event-match-1",
      anchorRef: {
        eventKind: "MATCH" as const,
        eventId: "event-match-1",
        teamSeasonId: "ts-1",
        contextEventId: "event-match-1",
      },
    };

    const all = await listEventParticipationSubjectPersonIds({ anchor, preset: "ALL_INVITEES" });
    expect(all).toEqual(["p1", "p2", "p3"]);

    const accepted = await listEventParticipationSubjectPersonIds({
      anchor,
      preset: "ACCEPTED_ONLY",
    });
    expect(accepted).toEqual(["p1"]);

    const declined = await listEventParticipationSubjectPersonIds({
      anchor,
      preset: "DECLINED_ONLY",
    });
    expect(declined).toEqual(["p2"]);

    const pending = await listEventParticipationSubjectPersonIds({
      anchor,
      preset: "NOT_RESPONDED",
    });
    expect(pending).toEqual(["p3"]);
  });

  it("resolves execution-time non-responders for smart reminder", async () => {
    mocks.participationResponse.findMany.mockResolvedValue([
      { personId: "p1", status: "YES" },
      { personId: "p2", status: "YES" },
    ]);

    await sendEventNoResponseSmartReminder({
      tenantId: "tenant-a",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      event: { eventKind: "MATCH", eventId: "event-match-1" },
      senderUserId: "user-1",
      viewerCanSend: true,
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceSpec: expect.objectContaining({
          components: [
            expect.objectContaining({
              explicit: { includePersonIds: ["p3"] },
            }),
          ],
        }),
      }),
    );
  });

  it("dispatches event communication with EVENT context and immutable audience", async () => {
    await sendEventContextCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      event: { eventKind: "MATCH", eventId: "event-match-1" },
      senderUserId: "user-1",
      viewerCanSend: true,
      kind: "MESSAGE",
      bodyText: "Infos zum Spiel",
      audiencePreset: "ACCEPTED_ONLY",
    });

    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contextRef: { kind: "EVENT", eventId: "event-match-1" },
      }),
    );
    expect(mocks.publishTeamCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ preservePreparedAudience: true }),
    );
  });

  it("rejects unauthorized event communication", async () => {
    await expect(
      previewEventCommunicationRecipients({
        tenantId: "tenant-a",
        teamId: "team-1",
        teamSeasonId: "ts-1",
        event: { eventKind: "MATCH", eventId: "event-match-1" },
        senderUserId: "user-1",
        viewerCanSend: false,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });

  it("poll reminder uses COMM-07 non-responder seam without mutating poll state", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "poll-comm-1",
      kind: "POLL",
      status: "PUBLISHED",
      contextRef: { kind: "TEAM", teamId: "team-1" },
      conversation: { teamId: "team-1" },
      poll: { lifecycle: "OPEN", deadlineAt: null },
    });
    mocks.listPollNonRespondedSnapshotIds.mockResolvedValue(["snap-1", "snap-2"]);
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { subjectPersonId: "p9" },
      { subjectPersonId: "p10" },
    ]);

    await sendPollNonResponderSmartReminder({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "poll-comm-1",
      senderUserId: "user-1",
      viewerCanSend: true,
    });

    expect(mocks.listPollNonRespondedSnapshotIds).toHaveBeenCalled();
    expect(mocks.platformCommunicationPoll.findFirst).not.toHaveBeenCalled();
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
  });

  it("request reminders reuse COMM-08 capacity and non-responder seams", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "req-comm-1",
      kind: "REQUEST",
      status: "PUBLISHED",
      conversation: { teamId: "team-1" },
      request: {
        lifecycle: "OPEN",
        deadlineAt: null,
        slots: [{ id: "slot-1", label: "Grill", requiredCapacity: 2 }],
      },
    });
    mocks.listRequestNonRespondedSnapshotIds.mockResolvedValue(["snap-a"]);
    mocks.platformCommunicationRecipientSnapshot.findMany.mockResolvedValue([
      { subjectPersonId: "p5" },
    ]);
    mocks.listRequestSlotsWithOpenCapacity.mockResolvedValue(["slot-1"]);
    mocks.platformCommunicationRequestClaim.count.mockResolvedValue(0);

    await sendRequestNonResponderSmartReminder({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "req-comm-1",
      senderUserId: "user-1",
      viewerCanSend: true,
    });
    expect(mocks.listRequestNonRespondedSnapshotIds).toHaveBeenCalled();

    await sendRequestOpenCapacitySmartReminder({
      tenantId: "tenant-a",
      teamId: "team-1",
      communicationId: "req-comm-1",
      senderUserId: "user-1",
      viewerCanSend: true,
    });
    expect(mocks.listRequestSlotsWithOpenCapacity).toHaveBeenCalled();
  });

  it("SCHEDULE_EXECUTION_CONCURRENCY — unique execution claim suppresses duplicate publish", async () => {
    mocks.communicationReminderExecution.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ communicationId: "comm-winner" });
    mocks.communicationReminderExecution.create.mockRejectedValueOnce({ code: "P2002" });

    const result = await dispatchSmartReminderCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-1",
      kind: "MESSAGE",
      bodyText: "Reminder",
      contextRef: { kind: "TEAM", teamId: "team-1" },
      audienceSpec: {
        composition: "UNION",
        components: [{ explicit: { includePersonIds: ["p1"] } }],
      },
      orchestrationMeta: { reminderOrigin: "EVENT_NO_RESPONSE" },
      executionIdentity: "schedule:abc:2026-09-27T12:00:00.000Z",
    });

    expect(result.status).toBe("duplicate_execution");
    expect(result.communicationId).toBe("comm-winner");
    expect(mocks.publishTeamCommunication).not.toHaveBeenCalled();
  });

  it("SCHEDULE_RETRY — publish failure releases execution claim for retry", async () => {
    mocks.communicationReminderExecution.findUnique.mockResolvedValue(null);
    mocks.communicationReminderExecution.create.mockResolvedValue({ id: "exec-1" });
    mocks.publishTeamCommunication.mockRejectedValueOnce(new Error("publish failed"));
    mocks.communicationReminderExecution.delete.mockResolvedValue(undefined);

    await expect(
      dispatchSmartReminderCommunication({
        tenantId: "tenant-a",
        teamId: "team-1",
        senderUserId: "user-1",
        kind: "MESSAGE",
        bodyText: "Reminder",
        contextRef: { kind: "TEAM", teamId: "team-1" },
        audienceSpec: {
          composition: "UNION",
          components: [{ explicit: { includePersonIds: ["p1"] } }],
        },
        orchestrationMeta: { reminderOrigin: "EVENT_NO_RESPONSE" },
        executionIdentity: "schedule:retry:2026-09-27T12:00:00.000Z",
      }),
    ).rejects.toThrow("publish failed");

    expect(mocks.communicationReminderExecution.delete).toHaveBeenCalled();
  });

  it("HISTORICAL_SNAPSHOT_IMMUTABILITY — dispatch freezes audience at publish time", async () => {
    await sendEventContextCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      teamSeasonId: "ts-1",
      event: { eventKind: "MATCH", eventId: "event-match-1" },
      senderUserId: "user-1",
      viewerCanSend: true,
      kind: "MESSAGE",
      bodyText: "Snapshot test",
      audiencePreset: "NOT_RESPONDED",
    });

    expect(mocks.publishTeamCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ preservePreparedAudience: true }),
    );
  });

  it("builds stable scheduled execution identity from schedule id and executeAt", () => {
    expect(
      buildReminderExecutionIdentity({
        scheduleId: "sched-1",
        executeAtIso: "2026-09-27T10:00:00.000Z",
      }),
    ).toBe("schedule:sched-1:2026-09-27T10:00:00.000Z");
  });

  it("prevents duplicate scheduled execution with same execution identity", async () => {
    mocks.communicationReminderExecution.findUnique.mockResolvedValue({
      communicationId: "comm-dup",
    });

    const result = await dispatchSmartReminderCommunication({
      tenantId: "tenant-a",
      teamId: "team-1",
      senderUserId: "user-1",
      kind: "MESSAGE",
      bodyText: "Reminder",
      contextRef: { kind: "TEAM", teamId: "team-1" },
      audienceSpec: {
        composition: "UNION",
        components: [{ explicit: { includePersonIds: ["p1"] } }],
      },
      orchestrationMeta: { reminderOrigin: "POLL_NO_RESPONSE" },
      executionIdentity: "schedule:abc:2026-09-27T12:00:00.000Z",
    });

    expect(result.status).toBe("duplicate_execution");
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });

  it("executes due schedule with dynamic recipient resolution", async () => {
    mocks.communicationReminderSchedule.findMany.mockResolvedValue([
      {
        id: "sched-1",
        tenantId: "tenant-a",
        teamId: "team-1",
        createdByUserId: "user-1",
        executionIdentity: "schedule:sched-1:2026-09-27T10:00:00.000Z",
        sourceReferenceJson: {
          kind: "EVENT_NO_RESPONSE",
          teamSeasonId: "ts-1",
          event: { eventKind: "MATCH", eventId: "event-match-1" },
        },
      },
    ]);
    mocks.resolveTeamCommunicationAuthorization.mockResolvedValue({ canSend: true });

    const summary = await processDueCommunicationReminderSchedules({
      now: new Date("2026-09-27T11:00:00.000Z"),
    });

    expect(summary.executed + summary.duplicates + summary.skipped).toBeGreaterThan(0);
    expect(mocks.communicationReminderSchedule.update).toHaveBeenCalled();
  });

  it("does not add REMINDER communication kind", () => {
    const schema = read("prisma/schema.prisma");
    expect(schema).toContain("PlatformCommunicationReminderOrigin");
    const kindBlock = schema.match(/enum PlatformCommunicationKind \{([\s\S]*?)\}/)?.[1] ?? "";
    expect(kindBlock).not.toContain("REMINDER");
  });

  it("reminder services do not reference push provider details", () => {
    const dispatch = read("lib/communication/smart-reminders/smart-reminder-dispatch.ts");
    expect(dispatch).not.toContain("web-push");
    expect(dispatch).not.toContain("VAPID");
    expect(dispatch).not.toContain("PushDeviceRegistration");
  });

  it("rejects expired poll reminder", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "poll-comm-1",
      kind: "POLL",
      status: "PUBLISHED",
      contextRef: { kind: "TEAM", teamId: "team-1" },
      conversation: { teamId: "team-1" },
      poll: { lifecycle: "OPEN", deadlineAt: new Date("2020-01-01T00:00:00.000Z") },
    });

    await expect(
      sendPollNonResponderSmartReminder({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "poll-comm-1",
        senderUserId: "user-1",
        viewerCanSend: true,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);
  });

  it("rejects closed request and full open-capacity reminders", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "req-comm-1",
      kind: "REQUEST",
      status: "PUBLISHED",
      conversation: { teamId: "team-1" },
      request: { lifecycle: "CLOSED", deadlineAt: null, slots: [] },
    });

    await expect(
      sendRequestNonResponderSmartReminder({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "req-comm-1",
        senderUserId: "user-1",
        viewerCanSend: true,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);

    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "req-comm-1",
      kind: "REQUEST",
      status: "PUBLISHED",
      conversation: { teamId: "team-1" },
      request: {
        lifecycle: "OPEN",
        deadlineAt: null,
        slots: [{ id: "slot-1", label: "Grill", requiredCapacity: 2 }],
      },
    });
    mocks.listRequestSlotsWithOpenCapacity.mockResolvedValue(["slot-1"]);
    mocks.platformCommunicationRequestClaim.count.mockResolvedValue(2);

    await expect(
      sendRequestOpenCapacitySmartReminder({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "req-comm-1",
        senderUserId: "user-1",
        viewerCanSend: true,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);
  });

  it("rejects cross-team poll reminder source", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "poll-comm-1",
      kind: "POLL",
      status: "PUBLISHED",
      contextRef: { kind: "TEAM", teamId: "team-other" },
      conversation: { teamId: "team-other" },
      poll: { lifecycle: "OPEN", deadlineAt: null },
    });

    await expect(
      sendPollNonResponderSmartReminder({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "poll-comm-1",
        senderUserId: "user-1",
        viewerCanSend: true,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });

  it("exposes reminder UI test ids for event, poll, and request surfaces", () => {
    const eventPanel = read("components/admin/teams/EventCommunicationPanel.tsx");
    expect(eventPanel).toContain('data-testid="event-comm-remind-no-response"');
    expect(eventPanel).toContain("Ausstehende Antworten erinnern");

    const pollCard = read("components/admin/teams/communication/TeamPollTimelineCard.tsx");
    expect(pollCard).toContain("Nicht abgestimmte Personen erinnern");

    const requestCard = read("components/admin/teams/communication/TeamRequestTimelineCard.tsx");
    expect(requestCard).toContain("Nicht reagierte Personen erinnern");
    expect(requestCard).toContain("Offene Plätze erinnern");
  });

  it("rejects closed poll reminder", async () => {
    mocks.platformCommunication.findFirst.mockResolvedValue({
      id: "poll-comm-1",
      kind: "POLL",
      status: "PUBLISHED",
      contextRef: { kind: "TEAM", teamId: "team-1" },
      conversation: { teamId: "team-1" },
      poll: { lifecycle: "CLOSED", deadlineAt: null },
    });

    await expect(
      sendPollNonResponderSmartReminder({
        tenantId: "tenant-a",
        teamId: "team-1",
        communicationId: "poll-comm-1",
        senderUserId: "user-1",
        viewerCanSend: true,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);
  });
});
