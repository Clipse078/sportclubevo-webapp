/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonalKalenderMonthWorkspace, {
  resolvePersonalCalendarDayVisibleBlockLimit,
} from "../PersonalKalenderMonthWorkspace";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number; title?: string }) => {
    if (key === "dayOverflowMore" && values?.count != null) {
      return `+${values.count} weitere`;
    }
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
      dayOverflowPanelAria: "Weitere Termine",
      filterGroupAria: "Filter",
      dueShort: "Fällig",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/planning/ActivitySceIcon", () => ({
  ActivitySceIcon: () => <span data-testid="activity-icon" />,
}));

vi.mock("@/components/icons/ProductDomainSceIcon", () => ({
  ProductDomainSceIcon: () => <span data-testid="domain-icon" />,
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
    expect(screen.getByTestId("personal-kalender-month-grid")).toHaveAttribute("data-week-rows", "5");

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
    expect(screen.getByTestId("personal-kalender-month-grid")).toHaveAttribute("data-week-rows", "6");
  });

  it("exposes compact toolbar navigation, month label, and filters with URL hrefs", () => {
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

    expect(screen.getByTestId("personal-kalender-previous-month")).toHaveAttribute(
      "href",
      navigation.previousMonthHref,
    );
    expect(screen.getByTestId("personal-kalender-today")).toHaveAttribute("href", navigation.todayHref);
    expect(screen.getByTestId("personal-kalender-next-month")).toHaveAttribute(
      "href",
      navigation.nextMonthHref,
    );
    expect(screen.getByTestId("personal-kalender-month-label").textContent?.length).toBeGreaterThan(3);
    expect(screen.getByTestId("personal-kalender-filter-alle")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("personal-kalender-filter-termine")).toHaveAttribute(
      "href",
      filterLinks[1]!.href,
    );
  });

  it("renders semantic event blocks with deep links and overflow control", () => {
    const dayKey = "2026-09-23";
    const weekRows = buildMonthGridCells("2026-09", "Europe/Zurich").length / 7;
    const visibleLimit = resolvePersonalCalendarDayVisibleBlockLimit(weekRows);
    const items = Array.from({ length: visibleLimit + 2 }).map(
      (_, index) =>
        normalized({
          id: `event:${index}`,
          semanticType: index % 2 === 0 ? "TRAINING" : "TASK",
          title: `Item ${index}`,
          deepLink: index % 2 === 0 ? `/dashboard/training/sessions/${index}/edit` : `/dashboard/aufgaben/${index}`,
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

    expect(screen.getByTestId("personal-kalender-month-grid")).toHaveAttribute(
      "data-visible-block-limit",
      String(visibleLimit),
    );
    expect(screen.getAllByTestId(/^personal-calendar-event-/).length).toBe(visibleLimit);
    const overflow = screen.getByTestId(`personal-calendar-overflow-${dayKey}`);
    expect(overflow.textContent).toBe("+2 weitere");
    fireEvent.click(overflow);
    expect(screen.getAllByTestId(/^personal-calendar-event-/).length).toBeGreaterThan(visibleLimit);
    expect(
      document.querySelector('a[href="/dashboard/training/sessions/0/edit"]'),
    ).not.toBeNull();
  });

  it("shows more than three visible blocks on desktop when week geometry allows", () => {
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
    const limit = Number(
      screen.getByTestId("personal-kalender-month-grid").getAttribute("data-visible-block-limit"),
    );
    expect(limit).toBeGreaterThan(3);
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
