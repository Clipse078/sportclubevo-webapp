import { describe, expect, it } from "vitest";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";
import { getPlanningHubItemHref } from "@/lib/planning-hub/planning-navigation";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";
import type {
  WeekplannerItem,
  WeekplannerVeranstaltungItem,
} from "@/lib/weekplanner/types";

function baseItem(
  partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "type" | "id">,
): WeekplannerItem {
  const start = new Date("2026-08-10T14:00:00.000Z");
  const end = new Date("2026-08-10T16:00:00.000Z");
  return {
    tenantId: "t1",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Test",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    ...partial,
  } as WeekplannerItem;
}

function veranstaltung(partial: Partial<WeekplannerVeranstaltungItem> = {}): WeekplannerVeranstaltungItem {
  const start = new Date("2026-08-10T00:00:00.000Z");
  const end = new Date("2026-08-12T00:00:00.000Z");
  return {
    ...baseItem({
      id: "veranstaltung:e1",
      type: "VERANSTALTUNG",
      startAt: start,
      endAt: end,
      canonicalStartAt: start,
      canonicalEndAt: end,
      title: "Clubfest",
    }),
    type: "VERANSTALTUNG",
    eventId: "e1",
    allDay: false,
    ...partial,
  } as WeekplannerVeranstaltungItem;
}

describe("SCE-OPS-01 — Veranstaltung routing", () => {
  it("timed Veranstaltung produces canonical valid href", () => {
    const item = veranstaltung({ allDay: false });
    expect(getPlanningHubItemHref(item)).toBe(getVeranstaltungHref("e1"));
  });

  it("all-day Veranstaltung produces canonical valid href", () => {
    const item = veranstaltung({ allDay: true });
    expect(getPlanningHubItemHref(item)).toBe("/dashboard/veranstaltungen/e1/edit");
  });

  it("multi-day all-day Veranstaltung produces canonical valid href", () => {
    const item = veranstaltung({
      allDay: true,
      endAt: new Date("2026-08-14T00:00:00.000Z"),
      canonicalEndAt: new Date("2026-08-14T00:00:00.000Z"),
    });
    expect(getPlanningHubItemHref(item)).toBe("/dashboard/veranstaltungen/e1/edit");
  });

  it("uses Prisma eventId, not synthetic planner id", () => {
    const item = veranstaltung({ id: "veranstaltung:e1", eventId: "prisma-real-id" });
    expect(getPlanningHubItemHref(item)).toBe("/dashboard/veranstaltungen/prisma-real-id/edit");
    expect(getPlanningHubItemHref(item)).not.toContain("veranstaltung:");
  });

  it("match and training hrefs use canonical ids", () => {
    const match = baseItem({
      id: "match:m1",
      type: "MATCH",
      eventId: "m1",
      opponentName: "Opponent",
      homeAway: "HOME",
      awayDressingRoomAllocations: [],
    }) as Extract<WeekplannerItem, { type: "MATCH" }>;
    expect(getPlanningHubItemHref(match)).toBe("/dashboard/matchcenter/m1");

    const training = baseItem({
      id: "training:s1",
      type: "TRAINING",
      trainingSessionId: "s1",
      teamSeasonId: "ts1",
    }) as Extract<WeekplannerItem, { type: "TRAINING" }>;
    expect(getPlanningHubItemHref(training)).toBe("/dashboard/training/sessions/s1/edit");
  });
});

describe("SCE-OPS-01 — match end time on weekplanner items", () => {
  it("detects missing canonical end on match items", () => {
    const start = new Date("2026-08-10T14:00:00.000Z");
    const item = baseItem({
      id: "match:m1",
      type: "MATCH",
      eventId: "m1",
      startAt: start,
      endAt: start,
      canonicalStartAt: start,
      canonicalEndAt: start,
      opponentName: "X",
      homeAway: "HOME",
      awayDressingRoomAllocations: [],
    });
    expect(weekplannerMatchRequiresEndTimeAction(item)).toBe(true);
  });

  it("does not flag valid canonical end", () => {
    const start = new Date("2026-08-10T14:00:00.000Z");
    const end = new Date("2026-08-10T16:00:00.000Z");
    const item = baseItem({
      id: "match:m2",
      type: "MATCH",
      eventId: "m2",
      startAt: start,
      endAt: end,
      canonicalStartAt: start,
      canonicalEndAt: end,
      opponentName: "X",
      homeAway: "HOME",
      awayDressingRoomAllocations: [],
    });
    expect(weekplannerMatchRequiresEndTimeAction(item)).toBe(false);
  });
});
