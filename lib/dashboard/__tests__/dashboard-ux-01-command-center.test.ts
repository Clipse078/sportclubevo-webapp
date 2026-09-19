import { describe, expect, it } from "vitest";
import {
  buildPersonalCockpitKpiStrip,
  groupPersonalAgendaItems,
} from "@/lib/dashboard/personal-cockpit";
import {
  buildCompactSchedulePrimaryLine,
  DASHBOARD_TODAY_PREVIEW_LIMIT,
} from "@/lib/dashboard/compact-schedule-presentation";
import {
  COMPACT_TOURNAMENT_LOGO_LIMIT,
  sliceTournamentParticipantLogos,
} from "@/lib/dashboard/tournament-participant-logos";
import { getDashboardQuickActionDefs } from "@/lib/dashboard/quick-actions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TodayScheduleItem } from "@/lib/dashboard/command-center";

describe("DASHBOARD-UX-01 — personal cockpit KPI strip", () => {
  it("reframes KPIs toward personal operational semantics", () => {
    const strip = buildPersonalCockpitKpiStrip({
      personalScheduleCount: 3,
      personalTasksAvailable: false,
      personalTaskCount: null,
      attentionCount: 2,
      openRegistrationCount: 4,
      canSeeRegistrations: true,
    });

    expect(strip.map((kpi) => kpi.label)).toEqual([
      "Meine Aufgaben",
      "Meine Termine",
      "Benötigt Aufmerksamkeit",
      "Offene Anmeldungen",
    ]);
    expect(strip.find((kpi) => kpi.key === "my-tasks")?.value).toBe("—");
    expect(strip.find((kpi) => kpi.key === "my-schedule")?.value).toBe("3");
    expect(strip.find((kpi) => kpi.key === "attention")?.value).toBe("2");
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
      },
      {
        key: "b",
        sortAt: new Date(),
        timeLabel: "10:00",
        typeLabel: "Spiel",
        title: "FCA – Gegner",
        dayGroup: "tomorrow",
      },
    ]);

    expect(grouped.today).toHaveLength(1);
    expect(grouped.tomorrow).toHaveLength(1);
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
  it("caps compact tournament logo rows", () => {
    const participants = Array.from({ length: 10 }, (_, index) => ({
      displayName: `Team ${index}`,
      logoUrl: null,
    }));
    const { visible, overflowCount } = sliceTournamentParticipantLogos(
      participants,
      COMPACT_TOURNAMENT_LOGO_LIMIT,
    );

    expect(visible).toHaveLength(COMPACT_TOURNAMENT_LOGO_LIMIT);
    expect(overflowCount).toBe(10 - COMPACT_TOURNAMENT_LOGO_LIMIT);
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
