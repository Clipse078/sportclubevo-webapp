/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildProgrammeFeedGroups,
  limitProgrammeFeedGroupsToPreview,
  DASHBOARD_PROGRAMME_PREVIEW_ITEM_LIMIT,
} from "../programme-feed-groups";
import { groupPersonalProgrammeItemsByDay } from "../programme-day-key";
import { buildPersonalProgrammeDayActivityMarkers } from "../programme-source-presentation";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import PersonalProgrammeMonthCalendar from "@/components/ui/calendar/PersonalProgrammeMonthCalendar";
import { PersonalProgrammeFeed } from "@/components/ui/dashboard/PersonalProgrammeFeed";

const TIME_ZONE = "Europe/Zurich";
const NOW = new Date("2026-09-24T10:00:00.000Z");

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number; title?: string }) => {
    if (key === "dayAriaActivitiesCount" && values?.count != null) {
      return `${values.count} Termine`;
    }
    if (key === "dayAriaOneActivityNamed" && values?.title) {
      return `1 Termin: ${values.title}`;
    }
    if (key === "activityMultipleShort" && values?.count != null) {
      return `${values.count} Termine`;
    }
    const map: Record<string, string> = {
      title: "Mein Programm",
      viewAll: "Alle anzeigen",
      groupToday: "Heute",
      groupTomorrow: "Morgen",
      allDay: "Ganztägig",
      statusCancelled: "Abgesagt",
      statusPostponed: "Verschoben",
      emptyTitle: "Leer",
      emptyDescription: "Leer",
      unsupported: "Unsupported",
      today: "Heute",
      previousMonth: "Prev",
      nextMonth: "Next",
      selected: "ausgewählt",
      ariaMonthGrid: "Grid",
      selectedDayPanel: "Selected",
      emptyDay: "Keine Termine an diesem Tag.",
      weekdayMon: "Mo",
      weekdayTue: "Di",
      weekdayWed: "Mi",
      weekdayThu: "Do",
      weekdayFri: "Fr",
      weekdaySat: "Sa",
      weekdaySun: "So",
    };
    return map[key] ?? key;
  },
}));

function programmeItem(
  id: string,
  startsAt: Date,
  overrides: Partial<PersonalProgrammeItem> = {},
): PersonalProgrammeItem {
  return {
    id,
    sourceType: "TRAINING",
    startsAt,
    title: `Title ${id}`,
    deepLink: `/dashboard/trainings/${id}`,
    typeLabel: "Training",
    ariaLabel: `Training ${id}`,
    ...overrides,
  };
}

describe("DASHBOARD-07R1E — programme preview", () => {
  it("limits dashboard feed groups to the first three upcoming items", () => {
    const items = [
      programmeItem("1", new Date("2026-09-27T07:30:00.000Z"), {
        sourceType: "TOURNAMENT",
        title: "Blitzturnier",
        typeLabel: "Turnier",
      }),
      programmeItem("2", new Date("2026-09-28T15:45:00.000Z"), { title: "F2 Training" }),
      programmeItem("3", new Date("2026-09-30T13:45:00.000Z"), { title: "F2 Training Sep 30" }),
      programmeItem("4", new Date("2026-09-30T16:45:00.000Z"), { title: "Senioren 40+ Training" }),
      programmeItem("5", new Date("2026-10-05T13:45:00.000Z"), { title: "F2 Training Oct" }),
    ];
    const groups = buildProgrammeFeedGroups({
      items,
      timeZone: TIME_ZONE,
      locale: "de-CH",
      now: NOW,
    });
    const preview = limitProgrammeFeedGroupsToPreview(groups);
    const previewIds = preview.flatMap((g) => g.items.map((i) => i.id));
    expect(previewIds).toEqual(["1", "2", "3"]);
    expect(DASHBOARD_PROGRAMME_PREVIEW_ITEM_LIMIT).toBe(3);

    const byDay = groupPersonalProgrammeItemsByDay(items, TIME_ZONE);
    expect(byDay.get("2026-09-30")?.length).toBe(2);
  });

  it("applies preview limit only in workspace presentation boundary", () => {
    const workspaceSource = readFileSync(
      join(process.cwd(), "components/ui/dashboard/PersonalDashboardWorkspace.tsx"),
      "utf8",
    );
    const loaderSource = readFileSync(
      join(process.cwd(), "lib/dashboard/personal-command-center.ts"),
      "utf8",
    );
    expect(workspaceSource).toContain("limitProgrammeFeedGroupsToPreview");
    expect(loaderSource).not.toContain("limitProgrammeFeedGroupsToPreview");
  });
});

describe("DASHBOARD-07R1E — context removal and CTA", () => {
  it("does not render relationship context lines in programme feed rows", () => {
    const groups = buildProgrammeFeedGroups({
      items: [
        programmeItem("ctx", new Date("2026-09-28T15:45:00.000Z"), {
          title: "Junioren F2 Training",
          contextLabel: "Junioren F2 · Trainer/in · FC Allschwil Junioren F2",
          subtitle: "Trainer/in",
          venue: "Kunstrasen",
        }),
      ],
      timeZone: TIME_ZONE,
      locale: "de-CH",
      now: NOW,
    });

    render(
      <PersonalProgrammeFeed
        groups={groups}
        supported
        timeLabelById={{ ctx: "17:00" }}
        viewAllHref="/dashboard/kalender?monat=2026-09&quelle=termine"
      />,
    );

    expect(screen.getByText("Junioren F2 Training")).toBeTruthy();
    expect(screen.getByText("Training")).toBeTruthy();
    expect(screen.getByText("Kunstrasen")).toBeTruthy();
    expect(screen.queryByText(/Trainer\/in/)).toBeNull();
    expect(screen.queryByText(/FC Allschwil/)).toBeNull();

    const cta = screen.getByTestId("personal-programme-view-all");
    expect(cta.getAttribute("href")).toBe("/dashboard/kalender?monat=2026-09&quelle=termine");
    expect(cta.textContent).toContain("Alle anzeigen");
  });
});

describe("DASHBOARD-07R1E — multi-team Wednesday reference", () => {
  const f2 = programmeItem("f2", new Date("2026-09-30T13:45:00.000Z"), {
    title: "Junioren F2 Training",
  });
  const senioren = programmeItem("s40", new Date("2026-09-30T16:45:00.000Z"), {
    title: "Senioren 40+ Training",
  });
  const navigation = {
    previousMonthHref: "/prev",
    nextMonthHref: "/next",
    todayHref: "/today",
  };

  it("shows truthful +1 and lists both trainings in selected-day agenda", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone={TIME_ZONE}
        items={[f2, senioren]}
        selectedDayKey="2026-09-30"
        navigation={navigation}
        todayDayKey="2026-09-24"
        timeLabelById={{ f2: "15:45", s40: "18:45" }}
      />,
    );

    const day = screen.getByTestId("personal-calendar-day-2026-09-30");
    expect(day.textContent).toContain("+1");
    expect(day.getAttribute("aria-label")).toContain("2 Termine");

    expect(screen.getByText("Junioren F2 Training")).toBeTruthy();
    expect(screen.getByText("Senioren 40+ Training")).toBeTruthy();
    const panel = screen.getByTestId("personal-programme-selected-day");
    const markers = panel.querySelectorAll("[data-programme-palette]");
    expect(markers.length).toBe(2);
    expect([...markers].every((el) => el.getAttribute("data-programme-palette") === "training-blue")).toBe(
      true,
    );
  });

  it("does not dedupe distinct trainings for activity markers (+1 overflow)", () => {
    const dayItems = [f2, senioren];
    const markers = buildPersonalProgrammeDayActivityMarkers(dayItems, dayItems.length);
    expect(markers.overflowCount).toBe(1);
    expect(markers.markerSourceTypes).toEqual(["TRAINING"]);
  });
});

describe("DASHBOARD-07R1E — selected-day agenda flows", () => {
  const navigation = {
    previousMonthHref: "/prev",
    nextMonthHref: "/next",
    todayHref: "/today",
  };

  it("shows tournament-orange on Sep 27 Blitzturnier day", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone={TIME_ZONE}
        items={[
          programmeItem("blitz", new Date("2026-09-27T07:30:00.000Z"), {
            sourceType: "TOURNAMENT",
            title: "Blitzturnier",
            typeLabel: "Turnier",
            venue: "Im Brüel",
          }),
        ]}
        selectedDayKey="2026-09-27"
        navigation={navigation}
        todayDayKey="2026-09-24"
        timeLabelById={{ blitz: "09:30" }}
      />,
    );

    expect(screen.getByText("Blitzturnier")).toBeTruthy();
    expect(screen.getByText("Im Brüel")).toBeTruthy();
    const panel = screen.getByTestId("personal-programme-selected-day");
    expect(panel.querySelector("[data-programme-palette]")?.getAttribute("data-programme-palette")).toBe(
      "tournament-orange",
    );
  });

  it("shows localized empty state for days without activities", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone={TIME_ZONE}
        items={[]}
        selectedDayKey="2026-09-10"
        navigation={navigation}
        todayDayKey="2026-09-24"
      />,
    );

    fireEvent.click(screen.getByTestId("personal-calendar-day-2026-09-10"));
    expect(screen.getByText("Keine Termine an diesem Tag.")).toBeTruthy();
  });

  it("selects day on click with keyboard-accessible grid buttons", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone={TIME_ZONE}
        items={[
          programmeItem("t1", new Date("2026-09-28T13:45:00.000Z"), { title: "F2 Training Sep 28" }),
        ]}
        navigation={navigation}
        todayDayKey="2026-09-24"
        timeLabelById={{ t1: "15:45" }}
      />,
    );

    const dayButton = screen.getByTestId("personal-calendar-day-2026-09-28");
    expect(dayButton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(dayButton);
    expect(dayButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("F2 Training Sep 28")).toBeTruthy();
  });
});

describe("DASHBOARD-07R1E — duplicate safety", () => {
  it("preserves single count when the same canonical id appears once", () => {
    const duplicate = programmeItem("dup", new Date("2026-09-30T13:45:00.000Z"));
    const markers = buildPersonalProgrammeDayActivityMarkers([duplicate], 1);
    expect(markers.overflowCount).toBe(0);
  });
});
