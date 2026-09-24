import { describe, expect, it } from "vitest";
import {
  buildPersonalCockpitKpiStrip,
  groupPersonalAgendaItems,
} from "@/lib/dashboard/personal-cockpit";
import {
  buildCompactSchedulePrimaryLine,
  DASHBOARD_TODAY_PREVIEW_LIMIT,
} from "@/lib/dashboard/compact-schedule-presentation";
import { MAX_VISIBLE_TOURNAMENT_LOGOS } from "@/lib/dashboard/tournament-participant-logos";
import { getDashboardQuickActionDefs } from "@/lib/dashboard/quick-actions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

describe("DASHBOARD-UX-01 — personal cockpit KPI strip", () => {
  it("reframes KPIs toward personal operational semantics", () => {
    const strip = buildPersonalCockpitKpiStrip({
      personalScheduleCount: 3,
      personalTasksAvailable: true,
      personalTaskCount: 0,
      personalAttentionAvailable: true,
      personalAttentionCount: 2,
    });

    expect(strip.map((kpi) => kpi.label)).toEqual([
      "Meine Aufgaben",
      "Meine Termine",
      "Benötigt meine Aufmerksamkeit",
    ]);
    expect(strip.find((kpi) => kpi.key === "my-tasks")?.value).toBe("0");
    expect(strip.find((kpi) => kpi.key === "my-tasks")?.context).toBeUndefined();
    expect(strip.find((kpi) => kpi.key === "my-schedule")?.value).toBe("3");
    expect(strip.find((kpi) => kpi.key === "attention")?.value).toBe("2");
    expect(strip.some((kpi) => kpi.key === "registrations")).toBe(false);
  });

  it("shows em dash for Meine Aufgaben when personal tasks are unauthorized", () => {
    const strip = buildPersonalCockpitKpiStrip({
      personalScheduleCount: 0,
      personalTasksAvailable: false,
      personalTaskCount: null,
      personalAttentionAvailable: false,
      personalAttentionCount: null,
    });
    expect(strip.find((kpi) => kpi.key === "my-tasks")?.value).toBe("—");
  });

  it("does not surface Aufgabenmodell implementation copy on unavailable tasks", () => {
    const strip = buildPersonalCockpitKpiStrip({
      personalScheduleCount: 0,
      personalTasksAvailable: false,
      personalTaskCount: null,
      personalAttentionAvailable: false,
      personalAttentionCount: null,
    });
    const serialized = JSON.stringify(strip);
    expect(serialized).not.toContain("Aufgabenmodell");
    expect(serialized).not.toContain("Datenmodell");
  });
});

describe("DASHBOARD-UX-01 — Meine Agenda grouping", () => {
  it("groups personal items into Heute and Morgen", () => {
    const grouped = groupPersonalAgendaItems([
      {
        key: "a",
        sortAt: new Date(),
        timeLabel: "09:00",
        typeLabel: "Training",
        title: "F2 Training",
        dayGroup: "today",
        sourceType: "TEAM_EVENT",
        ariaLabel: "Training: F2 Training",
      },
      {
        key: "b",
        sortAt: new Date(),
        timeLabel: "10:00",
        typeLabel: "Spiel",
        title: "FCA – Gegner",
        dayGroup: "tomorrow",
        sourceType: "TEAM_EVENT",
        ariaLabel: "Spiel: FCA – Gegner",
      },
    ]);

    expect(grouped.today).toHaveLength(1);
    expect(grouped.tomorrow).toHaveLength(1);
    expect(grouped.overdue).toHaveLength(0);
  });
});

describe("DASHBOARD-UX-01 — Heute im Verein limits", () => {
  it("uses dashboard preview limit of 5", () => {
    expect(DASHBOARD_TODAY_PREVIEW_LIMIT).toBe(5);
  });

  it("builds compact match primary lines from canonical presentation", () => {
    const item = {
      key: "event-1",
      sortAt: new Date(),
      timeLabel: "10:00",
      typeLabel: "Spiel",
      eventType: "MATCH",
      title: "Spiel",
      matchPresentation: {
        competitionLabel: "Liga",
        home: { displayName: "FCA D9", logoUrl: null },
        away: { displayName: "FC Ettingen", logoUrl: null },
      },
    } as TodayScheduleItem;

    expect(buildCompactSchedulePrimaryLine(item)).toBe("FCA D9 – FC Ettingen");
  });
});

describe("DASHBOARD-UX-01 — tournament participant logos", () => {
  it("uses the shared 16-identity cap for dashboard presentation", () => {
    expect(MAX_VISIBLE_TOURNAMENT_LOGOS).toBe(16);
  });
});

describe("DASHBOARD-UX-01 — Schnellaktionen permissions", () => {
  it("includes create shortcuts when events permissions are granted", () => {
    const actions = getDashboardQuickActionDefs([
      PERMISSIONS.EVENTS_MANAGE,
    ]);

    expect(actions.map((action) => action.key)).toEqual(
      expect.arrayContaining(["training", "match", "tournament", "veranstaltung"]),
    );
  });
});
