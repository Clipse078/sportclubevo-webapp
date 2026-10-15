/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonalKalenderMonthWorkspace from "../PersonalKalenderMonthWorkspace";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import { PROGRAMME_CALENDAR_VISIBLE_ENTRIES } from "@/lib/programme-engine/programme-calendar-presentation";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number; title?: string }) => {
    if (key === "dayAriaActivitiesCount" && values?.count != null) {
      return `${values.count} Termine`;
    }
    if (key === "dayAriaOneActivityNamed" && values?.title) {
      return `1 Termin: ${values.title}`;
    }
    const map: Record<string, string> = {
      today: "Heute",
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      selected: "ausgewählt",
      ariaMonthGrid: "Kalender Monatsraster",
      weekdayMon: "Mo",
      weekdayTue: "Di",
      weekdayWed: "Mi",
      weekdayThu: "Do",
      weekdayFri: "Fr",
      weekdaySat: "Sa",
      weekdaySun: "So",
      filterGroupAria: "Filter",
      legendTraining: "Training",
      legendMatch: "Spiel",
      legendTournament: "Turnier",
      legendEvent: "Veranstaltung",
      legendTask: "Aufgabe",
    };
    return map[key] ?? key;
  },
}));

function normalized(
  overrides: Partial<NormalizedCalendarItem> & Pick<NormalizedCalendarItem, "id" | "semanticType">,
): NormalizedCalendarItem {
  return {
    sourceType: "event",
    sourceId: overrides.id.split(":")[1] ?? "1",
    title: "Event title",
    startAt: new Date("2026-09-23T15:00:00.000Z"),
    allDay: false,
    deepLink: "/dashboard/planner/edit/1",
    iconKey: null,
    typeLabel: "Spiel",
    ariaLabel: "Event",
    ...overrides,
  };
}

const navigation = {
  previousMonthHref: "/dashboard/kalender?monat=2026-08",
  nextMonthHref: "/dashboard/kalender?monat=2026-10",
  todayHref: "/dashboard/kalender?monat=2026-09",
};

const filterLinks = [
  { key: "alle", label: "Alle", href: "/dashboard/kalender?quelle=alle", active: true },
  { key: "termine", label: "Termine", href: "/dashboard/kalender?quelle=termine", active: false },
  { key: "aufgaben", label: "Aufgaben", href: "/dashboard/kalender?quelle=aufgaben", active: false },
];

describe("SCE-CALENDAR-UX-03 — PersonalKalenderMonthWorkspace", () => {
  it("renders seven weekday columns with Monday first", () => {
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );
    const headers = screen.getAllByText(/^(Mo|Di|Mi|Do|Fr|Sa|So)$/);
    expect(headers.map((el) => el.textContent)).toEqual(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
  });

  it("supports five- and six-week month grids", () => {
    const five = buildMonthGridCells("2026-02", "Europe/Zurich").length / 7;
    const six = buildMonthGridCells("2026-08", "Europe/Zurich").length / 7;
    expect(five).toBe(5);
    expect(six).toBe(6);

    const { rerender } = render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-02"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );
    expect(screen.getAllByTestId(/^programme-calendar-day-/).length).toBe(five * 7);

    rerender(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-08"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );
    expect(screen.getAllByTestId(/^programme-calendar-day-/).length).toBe(six * 7);
  });

  it("exposes canonical engine navigation, month label, and filters with URL hrefs", () => {
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );

    expect(screen.getByTestId("month-activity-grid-previous")).toHaveAttribute(
      "href",
      navigation.previousMonthHref,
    );
    expect(screen.getByTestId("month-activity-grid-today")).toHaveAttribute("href", navigation.todayHref);
    expect(screen.getByTestId("month-activity-grid-next")).toHaveAttribute(
      "href",
      navigation.nextMonthHref,
    );
    expect(screen.getByTestId("month-activity-grid-label").textContent?.length).toBeGreaterThan(3);
    expect(screen.getByTestId("personal-kalender-filter-alle")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("personal-kalender-filter-termine")).toHaveAttribute(
      "href",
      filterLinks[1]!.href,
    );
  });

  it("renders canonical micro tiles with deep links and programme-style overflow", () => {
    const dayKey = "2026-09-23";
    const items = Array.from({ length: PROGRAMME_CALENDAR_VISIBLE_ENTRIES + 2 }).map(
      (_, index) =>
        normalized({
          id: `event:${index}`,
          semanticType: index % 2 === 0 ? "TRAINING" : "TASK",
          title: `Item ${index}`,
          deepLink:
            index % 2 === 0
              ? `/dashboard/training/sessions/${index}/edit`
              : `/dashboard/aufgaben/${index}`,
          typeLabel: index % 2 === 0 ? "Training" : "Aufgabe",
        }),
    );

    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{ [dayKey]: items }}
        timeLabelById={Object.fromEntries(items.map((item) => [item.id, "17:00"]))}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );

    expect(screen.getAllByTestId(/^programme-calendar-entry-/).length).toBe(
      PROGRAMME_CALENDAR_VISIBLE_ENTRIES,
    );
    expect(screen.getByTestId(`programme-calendar-overflow-${dayKey}`)).toHaveTextContent(
      "+2 weitere",
    );
    expect(
      document.querySelector('a[href="/dashboard/training/sessions/0/edit"]'),
    ).not.toBeNull();
  });

  it("does not render a permanent selected-day detail region below the grid", () => {
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );
    expect(screen.queryByTestId("personal-kalender-selected-tasks")).toBeNull();
    expect(screen.queryByTestId("personal-programme-selected-day")).toBeNull();
  });
});
