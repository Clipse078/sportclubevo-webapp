/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PersonalKalenderMonthWorkspace from "../PersonalKalenderMonthWorkspace";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";

vi.mock("@/lib/personal-agenda/use-personal-calendar-layout-mode", () => ({
  usePersonalCalendarLayoutMode: vi.fn(() => "desktop-grid"),
}));

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
      mobileEmptyDay: "Keine Termine oder Aufgaben an diesem Tag.",
      mobileSelectedDayAgendaAria: "Agenda",
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

function normalized(
  overrides: Partial<NormalizedCalendarItem> & Pick<NormalizedCalendarItem, "id" | "semanticType">,
): NormalizedCalendarItem {
  return {
    sourceType: "event",
    sourceId: overrides.id.split(":")[1] ?? "1",
    title: "Training block",
    startAt: new Date("2026-09-23T15:00:00.000Z"),
    allDay: false,
    deepLink: "/dashboard/training/sessions/1/edit",
    iconKey: null,
    typeLabel: "Training",
    ariaLabel: "Training, 17:00, F2",
    ...overrides,
  };
}

describe("SCE-CALENDAR-UX-04 — accessibility & responsive contracts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes aria-current on today and aria-pressed on selected day controls", () => {
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

    const todayControl = screen.getByTestId("personal-calendar-day-2026-09-27");
    expect(todayControl).toHaveAttribute("aria-pressed", "true");
    expect(todayControl.querySelector("time")).toHaveAttribute("aria-current", "date");
  });

  it("uses meaningful event link accessible names", () => {
    const dayKey = "2026-09-23";
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{
          [dayKey]: [
            normalized({
              id: "training:1",
              semanticType: "TRAINING",
              ariaLabel: "Training, 17:00, F2, KR2",
            }),
          ],
        }}
        timeLabelById={{ "training:1": "17:00" }}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );

    expect(screen.getByRole("link", { name: "Training, 17:00, F2, KR2" })).toHaveAttribute(
      "href",
      "/dashboard/training/sessions/1/edit",
    );
  });

  it("keeps overflow keyboard operable on desktop grid", () => {
    const dayKey = "2026-09-23";
    const items = Array.from({ length: 8 }).map((_, index) =>
      normalized({
        id: `event:${index}`,
        semanticType: "TRAINING",
        title: `Item ${index}`,
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

    const overflow = screen.getByTestId(`personal-calendar-overflow-${dayKey}`);
    expect(overflow.tagName).toBe("BUTTON");
    fireEvent.click(overflow);
    expect(overflow).toHaveAttribute("aria-expanded", "true");
  });
});

describe("SCE-CALENDAR-UX-04 — mobile compact month + agenda", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders compact grid without desktop event blocks and shows selected-day agenda", async () => {
    const { usePersonalCalendarLayoutMode } = await import(
      "@/lib/personal-agenda/use-personal-calendar-layout-mode"
    );
    vi.mocked(usePersonalCalendarLayoutMode).mockReturnValue("mobile-compact");

    const dayKey = "2026-09-23";
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        itemsByDayKey={{
          [dayKey]: [
            normalized({
              id: "training:1",
              semanticType: "TRAINING",
            }),
          ],
        }}
        timeLabelById={{ "training:1": "17:00" }}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );

    expect(screen.getByTestId("personal-kalender-month-workspace")).toHaveAttribute(
      "data-layout-mode",
      "mobile-compact",
    );
    const monthGrid = screen.getByTestId("personal-kalender-month-grid");
    expect(within(monthGrid).queryAllByTestId(/^personal-calendar-event-/).length).toBe(0);
    expect(screen.getByTestId("personal-kalender-mobile-day-agenda")).toBeTruthy();
    expect(screen.getByTestId("personal-calendar-compact-markers-2026-09-23")).toBeTruthy();
    fireEvent.click(screen.getByTestId("personal-calendar-day-2026-09-23"));
    expect(screen.getByRole("link", { name: "Training, 17:00, F2" })).toBeTruthy();
  });

  it("shows compact empty state for selected day without items", async () => {
    const { usePersonalCalendarLayoutMode } = await import(
      "@/lib/personal-agenda/use-personal-calendar-layout-mode"
    );
    vi.mocked(usePersonalCalendarLayoutMode).mockReturnValue("mobile-compact");

    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-08"
        timeZone="Europe/Zurich"
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={navigation}
        filterLinks={filterLinks}
      />,
    );

    expect(screen.getByTestId("personal-kalender-mobile-empty-day").textContent).toContain(
      "Keine Termine oder Aufgaben",
    );
  });
});
