/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PersonalProgrammeMonthCalendar from "../PersonalProgrammeMonthCalendar";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const count = values?.count as number | undefined;
    const title = values?.title as string | undefined;
    if (key === "dayAriaTrainingCount" && count != null) {
      return count === 1 ? "1 Training" : `${count} Trainings`;
    }
    if (key === "dayAriaMatchCount" && count != null) {
      return count === 1 ? "1 Spiel" : `${count} Spiele`;
    }
    if (key === "dayAriaTournamentCount" && count != null) {
      return count === 1 ? "1 Turnier" : `${count} Turniere`;
    }
    if (key === "dayAriaEventCount" && count != null) {
      return count === 1 ? "1 Veranstaltung" : `${count} Veranstaltungen`;
    }
    if (key === "dayAriaOneActivityNamed" && title) {
      return `1 Termin: ${title}`;
    }
    if (key === "dayAriaActivitiesCount" && count != null) {
      return `${count} Termine`;
    }
    const map: Record<string, string> = {
      today: "Heute",
      selected: "ausgewählt",
      ariaMonthGrid: "Kalender",
      selectedDayPanel: "Ausgewählter Tag",
      emptyDayPersonal: "Keine Termine für dich an diesem Tag.",
      emptyMonth: "Für dich sind in diesem Monat keine Termine geplant.",
      previousMonth: "Zurück",
      nextMonth: "Weiter",
      weekdayMon: "Mo",
      weekdayTue: "Di",
      weekdayWed: "Mi",
      weekdayThu: "Do",
      weekdayFri: "Fr",
      weekdaySat: "Sa",
      weekdaySun: "So",
      legendAria: "Legende",
      legendTraining: "Training",
      legendMatch: "Spiel",
      legendTournament: "Turnier",
      legendEvent: "Veranstaltung",
      statusCancelled: "Abgesagt",
      statusPostponed: "Verschoben",
    };
    return map[key] ?? key;
  },
}));

function buildItem(overrides: Partial<PersonalProgrammeItem> = {}): PersonalProgrammeItem {
  return {
    id: "event:1",
    sourceType: "TRAINING",
    startsAt: new Date("2026-10-10T07:30:00.000Z"),
    title: "Training · F2",
    deepLink: "/dashboard/trainings/1",
    typeLabel: "Training",
    ariaLabel: "Training",
    ...overrides,
  };
}

const navigation = {
  previousMonthHref: "/prev",
  nextMonthHref: "/next",
  todayHref: "/today",
};

describe("SCE-CALENDAR-UX-02 — personal calendar", () => {
  it("uses calm semantic dots — no Turnier pill text inside month cell", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-09"
        timeZone="Europe/Zurich"
        items={[
          buildItem({
            id: "t1",
            sourceType: "TOURNAMENT",
            startsAt: new Date("2026-09-27T07:30:00.000Z"),
            typeLabel: "Turnier",
            title: "Blitzturnier",
          }),
        ]}
        selectedDayKey="2026-09-27"
        navigation={navigation}
        todayDayKey="2026-09-24"
      />,
    );

    const day = screen.getByTestId("personal-calendar-day-2026-09-27");
    expect(day.textContent).not.toContain("Turnier");
    expect(day.querySelector('[data-programme-palette="tournament-orange"]')).toBeTruthy();
  });

  it("match marker uses match-red palette", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[buildItem({ sourceType: "MATCH", startsAt: new Date("2026-10-12T14:00:00.000Z") })]}
        selectedDayKey="2026-10-12"
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );
    expect(
      screen.getByTestId("personal-calendar-day-2026-10-12").querySelector('[data-programme-palette="match-red"]'),
    ).toBeTruthy();
  });

  it("mixed day aria summarizes types", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[
          buildItem({ id: "a", startsAt: new Date("2026-10-12T08:00:00.000Z") }),
          buildItem({ id: "b", sourceType: "TRAINING", startsAt: new Date("2026-10-12T09:00:00.000Z") }),
          buildItem({ id: "c", sourceType: "MATCH", startsAt: new Date("2026-10-12T14:00:00.000Z") }),
        ]}
        selectedDayKey="2026-10-12"
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );
    expect(screen.getByTestId("personal-calendar-day-2026-10-12").getAttribute("aria-label")).toContain(
      "2 Trainings, 1 Spiel",
    );
  });

  it("empty day personal copy", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[]}
        selectedDayKey="2026-10-08"
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );
    expect(screen.getByText("Keine Termine für dich an diesem Tag.")).toBeTruthy();
    expect(screen.getByTestId("personal-programme-empty-month")).toBeTruthy();
  });

  it("renders semantic legend", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[buildItem()]}
        selectedDayKey="2026-10-10"
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );
    expect(screen.getByTestId("personal-calendar-month-legend")).toBeTruthy();
    expect(screen.getByText("Spiel")).toBeTruthy();
  });

  it("keyboard arrow selects adjacent day", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[buildItem({ startsAt: new Date("2026-10-10T08:00:00.000Z") })]}
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );

    const start = screen.getByTestId("personal-calendar-day-2026-10-10");
    start.focus();
    fireEvent.keyDown(screen.getByTestId("month-activity-grid-days"), { key: "ArrowRight" });
    expect(screen.getByTestId("personal-calendar-day-2026-10-11").getAttribute("aria-pressed")).toBe("true");
  });

  it("chronological selected-day agenda", () => {
    render(
      <PersonalProgrammeMonthCalendar
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        items={[
          buildItem({ id: "late", startsAt: new Date("2026-10-10T16:00:00.000Z"), title: "Late" }),
          buildItem({ id: "early", startsAt: new Date("2026-10-10T08:00:00.000Z"), title: "Early" }),
        ]}
        selectedDayKey="2026-10-10"
        navigation={navigation}
        todayDayKey="2026-10-03"
      />,
    );
    const links = screen.getAllByRole("link");
    const trainingLinks = links.filter((l) => l.getAttribute("href")?.includes("trainings"));
    expect(trainingLinks[0]?.textContent).toContain("Early");
  });
});
