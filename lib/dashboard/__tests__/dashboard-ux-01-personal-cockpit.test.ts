import { describe, expect, it } from "vitest";
import {
  buildPersonalCockpitKpiStrip,
  groupPersonalAgendaItems,
} from "@/lib/dashboard/personal-cockpit";
import {
  buildCompactSchedulePrimaryLine,
  HEUTE_IM_VEREIN_INITIAL_LIMIT,
} from "@/lib/dashboard/compact-schedule-presentation";
import {
  MAX_VISIBLE_TOURNAMENT_LOGOS,
  sliceTournamentParticipantLogos,
} from "@/lib/dashboard/tournament-participant-logos";
import { buildAttentionItems } from "@/lib/dashboard/command-center";
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

  it("does not fabricate personal schedule counts when unsupported", () => {
    const strip = buildPersonalCockpitKpiStrip({
      personalScheduleCount: null,
      personalTasksAvailable: false,
      personalTaskCount: null,
      attentionCount: 0,
      openRegistrationCount: 0,
      canSeeRegistrations: false,
    });

    expect(strip.find((kpi) => kpi.key === "my-schedule")?.value).toBe("—");
  });
});

describe("DASHBOARD-UX-01 — Meine Agenda grouping", () => {
  it("groups canonical personal items into Heute and Morgen", () => {
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
  it("uses initial visible limit of 6", () => {
    expect(HEUTE_IM_VEREIN_INITIAL_LIMIT).toBe(6);
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
  const ids = (count: number) => Array.from({ length: count }, (_, i) => `p-${i}`);

  it.each([
    [1, 1, 0],
    [6, 6, 0],
    [10, 10, 0],
    [16, 16, 0],
    [17, 16, 1],
    [20, 16, 4],
  ])("%i participants → %i logos +%i overflow", (total, visible, overflow) => {
    const { visible: shown, overflowCount } = sliceTournamentParticipantLogos(ids(total));
    expect(shown).toHaveLength(visible);
    expect(overflowCount).toBe(overflow);
  });

  it("uses dashboard capacity of 16", () => {
    expect(MAX_VISIBLE_TOURNAMENT_LOGOS).toBe(16);
  });
});

describe("DASHBOARD-UX-01 — attention and quick actions", () => {
  it("only exposes authorized attention items from canonical counts", () => {
    const items = buildAttentionItems({
      newsInReviewCount: 0,
      openRegistrationCount: 2,
      scheduledNewsCount: 0,
      overdueActionCount: 0,
      canSeeNews: false,
      canSeeRegistrations: true,
      canSeeMeetings: false,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("registrations");
  });

  it("renders permission-aware cockpit quick actions", () => {
    const actions = getDashboardQuickActionDefs([PERMISSIONS.EVENTS_MANAGE], 8);
    const keys = actions.map((action) => action.key);

    expect(keys).toContain("training");
    expect(keys).toContain("match");
    expect(keys).toContain("tournament");
    expect(keys).toContain("veranstaltung");
    expect(keys).not.toContain("people-access");
  });
});
