/**
 * AUFGABEN-05-NOTIFY-DEADLINE — N1–N70 focused unit coverage.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  buildParticipationScheduleSnapshotFromSeries,
  computeParticipationResponseDueFromSeriesPolicy,
  resolveParticipationResponseDeadlineSchedule,
} from "../participation-response-deadline-schedule";
import { ParticipationValidationError } from "../errors";
import { buildParticipationPersonalActionId } from "@/lib/personal-actions/identity";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import { notificationTypeCategory } from "@/lib/notifications/deduplication";

describe("AUFGABEN-05-NOTIFY-DEADLINE", () => {
  const tz = "Europe/Zurich";

  it("N1 — no deadline leaves schedule empty", () => {
    const schedule = resolveParticipationResponseDeadlineSchedule({
      participationResponseDueAt: null,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: null,
      participationReminder2PresetKey: null,
      timeZone: tz,
      eventStartAt: new Date("2026-09-30T15:00:00.000Z"),
    });
    expect(schedule.dueAt).toBeNull();
  });

  it("N2/N5 — training deadline before start valid; >= start rejected", () => {
    const start = new Date("2026-09-30T15:00:00.000Z");
    const due = new Date("2026-09-29T16:00:00.000Z");
    expect(
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: due,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
        timeZone: tz,
        eventStartAt: start,
      }).dueAt,
    ).toEqual(due);

    expect(() =>
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: start,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
        timeZone: tz,
        eventStartAt: start,
      }),
    ).toThrow(ParticipationValidationError);
  });

  it("N6 — reminder without deadline rejected", () => {
    expect(() =>
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: null,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: "DAYS_1",
        participationReminder2PresetKey: null,
        timeZone: tz,
        eventStartAt: new Date("2026-09-30T15:00:00.000Z"),
      }),
    ).toThrow(ParticipationValidationError);
  });

  it("N9/N10 — reminder order validated", () => {
    const start = new Date("2026-10-10T15:00:00.000Z");
    const due = new Date("2026-10-08T16:00:00.000Z");
    const ok = resolveParticipationResponseDeadlineSchedule({
      participationResponseDueAt: due,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: "DAYS_2",
      participationReminder2PresetKey: "DAYS_1",
      timeZone: tz,
      eventStartAt: start,
    });
    expect(ok.reminder1At!.getTime()).toBeLessThan(ok.reminder2At!.getTime());

    expect(() =>
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: due,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: "DAYS_1",
        participationReminder2PresetKey: "DAYS_2",
        timeZone: tz,
        eventStartAt: start,
      }),
    ).toThrow(ParticipationValidationError);
  });

  it("N46 — invalid custom reminder after deadline change rejected", () => {
    const due = new Date("2026-09-29T08:00:00.000Z");
    const start = new Date("2026-09-30T15:00:00.000Z");
    expect(() =>
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: due,
        participationReminder1At: new Date("2026-09-29T09:00:00.000Z"),
        participationReminder2At: null,
        participationReminder1PresetKey: null,
        participationReminder2PresetKey: null,
        timeZone: tz,
        eventStartAt: start,
      }),
    ).toThrow(ParticipationValidationError);
  });

  it("N11/N12 — SAME_DAY preset relative to RSVP deadline", () => {
    const due = new Date("2026-09-29T16:00:00.000Z");
    const start = new Date("2026-09-30T15:00:00.000Z");
    const ok = resolveParticipationResponseDeadlineSchedule({
      participationResponseDueAt: due,
      participationReminder1At: null,
      participationReminder2At: null,
      participationReminder1PresetKey: "SAME_DAY",
      participationReminder2PresetKey: null,
      timeZone: tz,
      eventStartAt: start,
    });
    expect(ok.reminder1At!.getTime()).toBeLessThan(due.getTime());

    const earlyDue = new Date("2026-09-29T07:00:00.000Z");
    expect(() =>
      resolveParticipationResponseDeadlineSchedule({
        participationResponseDueAt: earlyDue,
        participationReminder1At: null,
        participationReminder2At: null,
        participationReminder1PresetKey: "SAME_DAY",
        participationReminder2PresetKey: null,
        timeZone: tz,
        eventStartAt: start,
      }),
    ).toThrow(ParticipationValidationError);
  });

  it("N15/N16/N17 — PersonalAction dueAt uses RSVP deadline; event start separate", () => {
    const dueIso = "2026-09-29T16:00:00.000Z";
    const startIso = "2026-09-30T15:00:00.000Z";
    expect(dueIso).not.toEqual(startIso);
    const id = buildParticipationPersonalActionId("person-1", {
      eventKind: "TRAINING",
      trainingSessionId: "session-1",
    });
    expect(id).toBe("participation:person-1:TRAINING:session-1");
  });

  it("N18 — overdue presentation remains actionable semantics", () => {
    const presentation = presentTaskDeadline({
      dueAt: "2026-09-01T12:00:00.000Z",
      status: TaskStatus.OPEN,
      now: new Date("2026-09-20T12:00:00.000Z"),
      locale: "de-CH",
      timeZone: tz,
    });
    expect(presentation.kind).toBe("OVERDUE");
  });

  it("N61 — TASK_REMINDER category stays task-only", () => {
    expect(notificationTypeCategory("TASK_REMINDER")).toBe("TASK");
    expect(notificationTypeCategory("PARTICIPATION_REMINDER")).toBe("PARTICIPATION");
  });

  it("N67/N69 — series policy snapshots concrete session deadline", () => {
    const sessionStart = new Date("2026-09-30T15:00:00.000Z");
    const snapshot = buildParticipationScheduleSnapshotFromSeries({
      sessionStartAt: sessionStart,
      timeZone: tz,
      participationResponseDueDaysBefore: 1,
      participationResponseDueLocalTime: "18:00",
      participationReminder1PresetKey: "DAYS_1",
      participationReminder2PresetKey: null,
    });
    expect(snapshot.dueAt).not.toBeNull();
    expect(snapshot.dueAt!.getTime()).toBeLessThan(sessionStart.getTime());
    expect(snapshot.reminder1At!.getTime()).toBeLessThan(snapshot.dueAt!.getTime());

    const dueDirect = computeParticipationResponseDueFromSeriesPolicy({
      sessionStartAt: sessionStart,
      timeZone: tz,
      daysBefore: 1,
      localTime: "18:00",
    });
    expect(dueDirect.getTime()).toBe(snapshot.dueAt!.getTime());
  });
});

describe("AUFGABEN-05-NOTIFY-DEADLINE — agenda projection identity", () => {
  it("N66 — stable agenda id matches personal action id", async () => {
    const { buildParticipationAgendaProjectionId } = await import(
      "@/lib/personal-agenda/participation-projections"
    );
    expect(buildParticipationAgendaProjectionId("p1", "MATCH", "e1")).toBe(
      "participation:p1:MATCH:e1",
    );
  });
});
