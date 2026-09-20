/**
 * AUFGABEN-05-NOTIFY-DEADLINE A1 — acceptance scenarios N43–N59 and projection semantics.
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildParticipationScheduleSnapshotFromSeries,
  recomputeParticipationRemindersAfterDueChange,
} from "../participation-response-deadline-schedule";
import { buildParticipationPersonalActionId } from "@/lib/personal-actions/identity";
import { buildParticipationAgendaProjectionId } from "@/lib/personal-agenda/participation-projections";
import { buildParticipationReminderCopy, buildParticipationOverdueCopy } from "@/lib/notifications/participation-copy";
import { formatLocalDateTimeLabel } from "@/lib/reminders/deadline-reminder-schedule";

vi.mock("@/lib/participation/authorization", () => ({
  getAuthorizedPersonIdsForUser: vi.fn(),
}));

vi.mock("@/lib/personal-actions/sources/attendance-obligations", () => ({
  loadAttendanceObligationCandidates: vi.fn(),
  filterActionableAttendanceCandidates: vi.fn((rows: unknown[]) => rows),
}));

import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { loadAttendanceObligationCandidates } from "@/lib/personal-actions/sources/attendance-obligations";
import { loadParticipationDeadlineProjections } from "@/lib/personal-agenda/participation-projections";

const tz = "Europe/Zurich";

describe("AUFGABEN-05-NOTIFY-DEADLINE A1", () => {
  it("N43/N25 — stable PersonalAction id when deadline moves", () => {
    const idBefore = buildParticipationPersonalActionId("person-1", {
      eventKind: "MATCH",
      eventId: "match-1",
    });
    const idAfter = buildParticipationPersonalActionId("person-1", {
      eventKind: "MATCH",
      eventId: "match-1",
    });
    expect(idBefore).toBe(idAfter);
    expect(idBefore).toBe("participation:person-1:MATCH:match-1");
  });

  it("N44/N26 — stable agenda projection id when deadline moves", () => {
    const id = buildParticipationAgendaProjectionId("person-1", "MATCH", "match-1");
    expect(id).toBe("participation:person-1:MATCH:match-1");
  });

  it("N45 — preset reminder recalculates when due changes", () => {
    const dueX = new Date("2026-09-29T16:00:00.000Z");
    const dueY = new Date("2026-09-28T16:00:00.000Z");
    const start = new Date("2026-09-30T15:00:00.000Z");
    const scheduleX = recomputeParticipationRemindersAfterDueChange({
      participationResponseDueAt: dueX,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
      timeZone: tz,
      eventStartAt: start,
    });
    const scheduleY = recomputeParticipationRemindersAfterDueChange({
      participationResponseDueAt: dueY,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
      timeZone: tz,
      eventStartAt: start,
    });
    expect(scheduleX.reminder1At!.getTime()).not.toEqual(scheduleY.reminder1At!.getTime());
  });

  it("N48 — deadline removal drops agenda projection but obligation can remain without due", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "Child",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Spiel",
        eventStartAt: new Date("2026-09-30T15:00:00.000Z"),
        participationResponseDueAt: null,
        responseId: null,
        responseStatus: "OPEN",
      },
    ] as never);

    const items = await loadParticipationDeadlineProjections({
      tenantId: "tenant-a",
      userId: "guardian-a",
      rangeStart: new Date("2026-09-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-10-31T00:00:00.000Z"),
    });
    expect(items).toHaveLength(0);
  });

  it("N31/N67 — series policy snapshot does not inherit at runtime (distinct session snapshots)", () => {
    const sessionStart = new Date("2026-10-10T15:00:00.000Z");
    const policyA = buildParticipationScheduleSnapshotFromSeries({
      sessionStartAt: sessionStart,
      timeZone: tz,
      participationResponseDueDaysBefore: 1,
      participationResponseDueLocalTime: "18:00",
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
    });
    const policyB = buildParticipationScheduleSnapshotFromSeries({
      sessionStartAt: sessionStart,
      timeZone: tz,
      participationResponseDueDaysBefore: 2,
      participationResponseDueLocalTime: "18:00",
      participationReminder1PresetKey: "DAYS_2",
      participationReminder2PresetKey: null,
    });
    expect(policyA.dueAt!.getTime()).not.toEqual(policyB.dueAt!.getTime());
  });

  it("N32 — DST spring session keeps 18:00 local wall clock for series due policy", () => {
    const sessionStart = new Date("2026-03-30T15:00:00.000Z");
    const snapshot = buildParticipationScheduleSnapshotFromSeries({
      sessionStartAt: sessionStart,
      timeZone: tz,
      participationResponseDueDaysBefore: 1,
      participationResponseDueLocalTime: "18:00",
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
    });
    const label = formatLocalDateTimeLabel(snapshot.dueAt!, "de-CH", tz);
    expect(label).toMatch(/18:00/);
  });

  it("N32 — DST fall session keeps 18:00 local wall clock for series due policy", () => {
    const sessionStart = new Date("2026-10-26T16:00:00.000Z");
    const snapshot = buildParticipationScheduleSnapshotFromSeries({
      sessionStartAt: sessionStart,
      timeZone: tz,
      participationResponseDueDaysBefore: 1,
      participationResponseDueLocalTime: "18:00",
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
    });
    const label = formatLocalDateTimeLabel(snapshot.dueAt!, "de-CH", tz);
    expect(label).toMatch(/18:00/);
  });

  it("N42 — notification copy uses tenant-local datetime and no decline implication", () => {
    const due = new Date("2026-09-29T16:00:00.000Z");
    const dueLabel = formatLocalDateTimeLabel(due, "de-CH", tz);
    expect(dueLabel).not.toMatch(/UTC/);
    const reminder = buildParticipationReminderCopy({
      participantDisplayName: "Max",
      eventTitle: "Training",
      dueLabel,
      stage: 1,
    });
    expect(reminder.body).toMatch(/Teilnahme/);
    expect(reminder.body).toMatch(/Antwortfrist/);
    const overdue = buildParticipationOverdueCopy({
      participantDisplayName: "Max",
      dueLabel,
    });
    expect(overdue.body).toMatch(/ausstehend|abgelaufen/i);
    expect(overdue.body).not.toMatch(/abwesend|abgesagt|declined/i);
  });

  it("N43 — agenda projection appears when due set and moves with dueAt", async () => {
    vi.mocked(getAuthorizedPersonIdsForUser).mockResolvedValue(["child-1"]);
    const dueX = new Date("2026-09-29T16:00:00.000Z");
    vi.mocked(loadAttendanceObligationCandidates).mockResolvedValue([
      {
        personId: "child-1",
        personDisplayName: "Child",
        teamSeasonId: "ts-1",
        teamDisplayName: "U15",
        eventKind: "MATCH",
        eventId: "match-1",
        eventTitle: "Spiel",
        eventStartAt: new Date("2026-09-30T15:00:00.000Z"),
        participationResponseDueAt: dueX,
        responseId: null,
        responseStatus: "OPEN",
      },
    ] as never);

    const itemsX = await loadParticipationDeadlineProjections({
      tenantId: "tenant-a",
      userId: "guardian-a",
      rangeStart: new Date("2026-09-01T00:00:00.000Z"),
      rangeEnd: new Date("2026-10-31T00:00:00.000Z"),
    });
    expect(itemsX).toHaveLength(1);
    expect(itemsX[0].id).toBe("participation:child-1:MATCH:match-1");
    expect(itemsX[0].startAt).toEqual(dueX);
  });
});
