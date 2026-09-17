import { describe, expect, it } from "vitest";
import {
  daypartVisibleRange,
  defaultDaypartForLocalTime,
  localMinutesFromMidnight,
  resolveCalendarViewport,
} from "../planning-dayparts";
import {
  calendarHeightPxForClippedActivity,
  calendarTopPxForClippedActivity,
  clipActivityToVisibleWindow,
  intervalIntersectsVisibleWindow,
} from "../scheduler/activity-window";
import { CALENDAR_DAYPART_PIXELS_PER_MINUTE } from "../scheduler/time-scale";
import {
  buildPlanningHubHref,
  heuteCalendarZeitParam,
  parsePlanningHubUrlState,
} from "../planner-url";

const TZ = "Europe/Zurich";

function atLocal(hour: number, minute: number): Date {
  return new Date(`2026-09-16T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000+02:00`);
}

describe("PLANNING-HUB-02D daypart model", () => {
  it("defines canonical four-hour windows", () => {
    expect(daypartVisibleRange("morgen")).toEqual({
      startMinutes: 8 * 60,
      endMinutes: 12 * 60,
      totalMinutes: 4 * 60,
    });
    expect(daypartVisibleRange("nachmittag").startMinutes).toBe(12 * 60);
    expect(daypartVisibleRange("abend").startMinutes).toBe(16 * 60);
    expect(daypartVisibleRange("spaet").endMinutes).toBe(24 * 60);
  });

  const cases: [number, number, string][] = [
    [8, 0, "morgen"],
    [11, 59, "morgen"],
    [12, 0, "nachmittag"],
    [15, 59, "nachmittag"],
    [16, 0, "abend"],
    [19, 59, "abend"],
    [20, 0, "spaet"],
    [23, 59, "spaet"],
    [0, 0, "morgen"],
    [7, 59, "morgen"],
  ];

  for (const [h, m, expected] of cases) {
    it(`resolves ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} → ${expected}`, () => {
      expect(defaultDaypartForLocalTime(atLocal(h, m), TZ)).toBe(expected);
    });
  }
});

describe("PLANNING-HUB-02D URL state", () => {
  it("restores explicit dayparts", () => {
    expect(parsePlanningHubUrlState({ zeit: "morgen" }).calendarZeit).toBe("morgen");
    expect(parsePlanningHubUrlState({ zeit: "nachmittag" }).calendarZeit).toBe("nachmittag");
    expect(parsePlanningHubUrlState({ zeit: "abend" }).calendarZeit).toBe("abend");
    expect(parsePlanningHubUrlState({ zeit: "spaet" }).calendarZeit).toBe("spaet");
  });

  it("normalizes invalid zeit to canonical Ganzer Tag (no param)", () => {
    const state = parsePlanningHubUrlState({ zeit: "invalid" }, { now: atLocal(14, 0), timeZone: TZ });
    expect(state.calendarZeit).toBeUndefined();
  });

  it("preserves filters when switching daypart", () => {
    const base = parsePlanningHubUrlState({
      week: "2026-09-14",
      typ: "trainings",
      team: "t1",
      facility: "f1",
      konflikte: "1",
      plan: "plan-1",
    });
    const href = buildPlanningHubHref(base, { calendarZeit: "abend" });
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("zeit=abend");
    expect(href).toContain("typ=trainings");
    expect(href).toContain("team=t1");
    expect(href).toContain("facility=f1");
    expect(href).toContain("konflikte=1");
    expect(href).toContain("plan=plan-1");
  });

  it("omits zeit when implicit default (no explicit param)", () => {
    const href = buildPlanningHubHref(parsePlanningHubUrlState({ week: "2026-09-14" }));
    expect(href).not.toContain("zeit=");
  });

  it("handles explicit zeit=ganz as Ganzer Tag", () => {
    const state = parsePlanningHubUrlState({ zeit: "ganz" });
    expect(state.calendarZeit).toBe("ganz");
    expect(buildPlanningHubHref(state)).not.toContain("zeit=");
    expect(resolveCalendarViewport("ganz", atLocal(10, 0), TZ).mode).toBe("full");
  });

  it("round-trips reload-compatible explicit state", () => {
    const href = buildPlanningHubHref(
      parsePlanningHubUrlState({ week: "2026-09-14", zeit: "spaet", typ: "spiele" }),
    );
    const qs = new URL(href, "https://example.test").searchParams;
    expect(qs.get("zeit")).toBe("spaet");
    expect(qs.get("week")).toBe("2026-09-14");
    expect(qs.get("typ")).toBe("spiele");
  });
});

describe("PLANNING-HUB-02D Heute", () => {
  it("preserves explicit Abend when navigating to Heute", () => {
    expect(heuteCalendarZeitParam(atLocal(18, 30), TZ, "abend")).toBe("abend");
  });

  it("preserves canonical Ganzer Tag (undefined) on Heute", () => {
    expect(heuteCalendarZeitParam(atLocal(6, 0), TZ, undefined)).toBeUndefined();
  });

  it("preserves filters in Heute href patch", () => {
    const base = parsePlanningHubUrlState({ typ: "turniere", konflikte: "1", zeit: "spaet" });
    const href = buildPlanningHubHref(base, {
      week: "2026-09-14",
      calendarZeit: heuteCalendarZeitParam(atLocal(21, 30), TZ, base.calendarZeit),
    });
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("zeit=spaet");
    expect(href).toContain("typ=turniere");
    expect(href).toContain("konflikte=1");
  });
});

describe("PLANNING-HUB-02D geometry", () => {
  const window = daypartVisibleRange("abend");

  it("clips and positions activities in window", () => {
    const clip = clipActivityToVisibleWindow(17 * 60, 18 * 60 + 30, window);
    expect(clip).not.toBeNull();
    const top = calendarTopPxForClippedActivity(clip!.visibleStartMinutes, window, CALENDAR_DAYPART_PIXELS_PER_MINUTE);
    const height = calendarHeightPxForClippedActivity(
      clip!.visibleStartMinutes,
      clip!.visibleEndMinutes,
      CALENDAR_DAYPART_PIXELS_PER_MINUTE,
    );
    expect(top).toBe(60 * CALENDAR_DAYPART_PIXELS_PER_MINUTE);
    expect(height).toBeCloseTo(90 * CALENDAR_DAYPART_PIXELS_PER_MINUTE, 0);
  });

  it("excludes activities outside window", () => {
    expect(intervalIntersectsVisibleWindow(10 * 60, 11 * 60, window)).toBe(false);
    expect(clipActivityToVisibleWindow(10 * 60, 11 * 60, window)).toBeNull();
  });

  it("clips top and bottom for spanning activities", () => {
    const clip = clipActivityToVisibleWindow(15 * 60 + 30, 21 * 60, window);
    expect(clip?.visibleStartMinutes).toBe(16 * 60);
    expect(clip?.visibleEndMinutes).toBe(20 * 60);
    expect(clip?.continuesFromBefore).toBe(true);
    expect(clip?.continuesAfter).toBe(true);
  });

  it("handles Spät midnight boundary", () => {
    const spaet = daypartVisibleRange("spaet");
    const clip = clipActivityToVisibleWindow(23 * 60 + 30, 24 * 60, spaet);
    expect(clip?.visibleEndMinutes).toBe(24 * 60);
    expect(localMinutesFromMidnight(atLocal(23, 45), TZ)).toBe(23 * 60 + 45);
  });
});

describe("PLANNING-HUB-02D continuation", () => {
  it("identifies previous and next period continuation", () => {
    const abend = daypartVisibleRange("abend");
    const cross = clipActivityToVisibleWindow(19 * 60 + 30, 20 * 60 + 30, abend);
    expect(cross?.continuesAfter).toBe(true);
    expect(cross?.continuesFromBefore).toBe(false);

    const spaet = daypartVisibleRange("spaet");
    const late = clipActivityToVisibleWindow(19 * 60 + 30, 20 * 60 + 30, spaet);
    expect(late?.continuesFromBefore).toBe(true);
    expect(late?.continuesAfter).toBe(false);
  });
});

describe("PLANNING-HUB-02D lanes / aggregation / conflicts", () => {
  it("temporal overlap lanes remain deterministic", async () => {
    const { assignIntervalLanes } = await import("../scheduler/interval-lanes");
    const lanes = assignIntervalLanes([
      { id: "a", startMs: 0, endMs: 90 },
      { id: "b", startMs: 15, endMs: 105 },
    ]);
    expect(lanes.get("a")?.lane).toBe(0);
    expect(lanes.get("b")?.lane).toBe(1);
  });

  it("aggregate summary exposes identities when allowed", async () => {
    const { summarizeAggregateCluster } = await import("../scheduler/aggregate-cluster");
    const items = [
      {
        id: "1",
        type: "TRAINING" as const,
        title: "Training",
        teamNames: ["F2"],
        startAt: new Date("2026-09-16T15:00:00.000Z"),
        endAt: new Date("2026-09-16T16:00:00.000Z"),
        pitchAllocations: [],
        dressingRoomAllocations: [],
        awayDressingRoomAllocations: [],
        conflicts: [],
      },
    ];
    const summary = summarizeAggregateCluster(items as never, "17:00–18:00");
    expect(summary.headline).toContain("Training");
  });
});

describe("PLANNING-HUB-02D implicit viewport", () => {
  it("uses Ganzer Tag when zeit is omitted", () => {
    const view = resolveCalendarViewport(undefined, atLocal(14, 15), TZ);
    expect(view.mode).toBe("full");
  });
});

describe("PLANNING-HUB-02D current time visibility", () => {
  it("current window contains now only for matching daypart", () => {
    const abend = daypartVisibleRange("abend");
    const nowMin = localMinutesFromMidnight(atLocal(17, 30), TZ);
    expect(nowMin >= abend.startMinutes && nowMin < abend.endMinutes).toBe(true);
    const morgen = daypartVisibleRange("morgen");
    expect(nowMin >= morgen.startMinutes && nowMin < morgen.endMinutes).toBe(false);
  });
});
