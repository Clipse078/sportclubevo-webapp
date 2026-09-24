/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonalProgrammeMonthCalendar from "../PersonalProgrammeMonthCalendar";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { count?: number; title?: string }) => {
    if (key === "dayAriaActivities" && values?.count != null) {
      return `${values.count} activities`;
    }
    if (key === "dayAriaActivitiesCount" && values?.count != null) {
      return `${values.count} appointments`;
    }
    if (key === "dayAriaOneActivityNamed" && values?.title) {
      return `1 appointment: ${values.title}`;
    }
    if (key === "activityMultipleShort" && values?.count != null) {
      return `${values.count} appts`;
    }
    const map: Record<string, string> = {
      title: "My calendar",
      today: "Today",
      previousMonth: "Previous",
      nextMonth: "Next",
      selected: "selected",
      ariaMonthGrid: "Calendar grid",
      selectedDayPanel: "Selected day",
      emptyDay: "No personal appointments",
      dayAriaOneActivity: "1 activity",
      dayAriaOneActivityNamed: "1 appointment: {title}",
      dayAriaActivitiesCount: "{count} appointments",
      activityMultipleShort: "{count} appts",
      statusCancelled: "Cancelled",
      statusPostponed: "Postponed",
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

function buildItem(overrides: Partial<PersonalProgrammeItem> = {}): PersonalProgrammeItem {
  return {
    id: "event:1",
    sourceType: "TRAINING",
    startsAt: new Date("2026-09-23T13:45:00.000Z"),
    title: "Training · F2",
    deepLink: "/dashboard/trainings/1",
    typeLabel: "Training",
    ariaLabel: "Training: F2",
    ...overrides,
  };
}

describe("PersonalProgrammeMonthCalendar", () => {
  const navigation = {
    previousMonthHref: "/prev",
    nextMonthHref: "/next",
    todayHref: "/today",
  };

  it("shows Sep 27 Blitzturnier activity on calendar grid (07R1 regression)", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[
          buildItem({
            id: "event:blitz",
            sourceType: "TOURNAMENT",
            startsAt: new Date("2026-09-27T07:30:00.000Z"),
            title: "Blitzturnier",
            typeLabel: "Turnier",
          }),
        ]}
        selectedDayKey="2026-09-27"
        navigation={navigation}
        todayDayKey="2026-09-24"
      />,
    );

    const day = screen.getByTestId("personal-calendar-day-2026-09-27");
    expect(day.getAttribute("aria-label")).toContain("Blitzturnier");
    expect(day.textContent).toContain("Turnier");
  });

  it("shows activity dot day and selected-day entry from programme items", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[buildItem()]}
        selectedDayKey="2026-09-23"
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    expect(screen.getByTestId("personal-calendar-day-2026-09-23")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Training/i }).getAttribute("href")).toBe(
      "/dashboard/trainings/1",
    );
  });

  it("announces multiple activities in aria label", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[
          buildItem({ id: "event:1", startsAt: new Date("2026-09-23T08:00:00.000Z") }),
          buildItem({ id: "event:2", startsAt: new Date("2026-09-23T18:00:00.000Z"), title: "Match" }),
        ]}
        selectedDayKey="2026-09-23"
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    const dayButton = screen.getByTestId("personal-calendar-day-2026-09-23");
    expect(dayButton.getAttribute("aria-label")).toMatch(/2 appointments|2 activities/);
  });

  it("shows empty selected day copy when no items", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[]}
        selectedDayKey="2026-09-10"
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    expect(screen.getByText("No personal appointments")).toBeTruthy();
  });

  it("does not render unauthorized programme rows that were never passed in", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[]}
        selectedDayKey="2026-09-23"
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    expect(screen.queryByText("Secret Match")).toBeNull();
    const day = screen.getByTestId("personal-calendar-day-2026-09-23");
    expect(day.getAttribute("aria-label")).not.toContain("Termin");
  });

  it("selects day on click and lists canonical sort order", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[
          buildItem({
            id: "event:late",
            startsAt: new Date("2026-09-24T16:00:00.000Z"),
            title: "Late training",
          }),
          buildItem({
            id: "event:early",
            startsAt: new Date("2026-09-24T08:00:00.000Z"),
            title: "Early training",
          }),
        ]}
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    fireEvent.click(screen.getByTestId("personal-calendar-day-2026-09-24"));
    const links = screen.getAllByRole("link").filter((el) => el.getAttribute("href")?.includes("trainings"));
    expect(links[0]?.textContent).toContain("Early training");
  });

  it("shows cancelled status on selected-day list", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[buildItem({ status: "cancelled" })]}
        selectedDayKey="2026-09-23"
        navigation={navigation}
        todayDayKey="2026-09-20"
      />,
    );

    expect(screen.getByText("Cancelled")).toBeTruthy();
  });
});
