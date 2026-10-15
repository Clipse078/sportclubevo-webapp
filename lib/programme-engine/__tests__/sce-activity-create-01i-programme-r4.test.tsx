/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const labels: Record<string, string> = {
      legendTraining: "Training",
      legendMatch: "Spiel",
      legendTournament: "Turnier",
      legendEvent: "Veranstaltung",
      legendTask: "Aufgabe",
      legendAria: "Aktivitätstypen",
      ariaMonthGrid: "Monatskalender",
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      today: "Heute",
      weekdayMon: "Mo",
      weekdayTue: "Di",
      weekdayWed: "Mi",
      weekdayThu: "Do",
      weekdayFri: "Fr",
      weekdaySat: "Sa",
      weekdaySun: "So",
      filterGroupAria: "Filter",
      dayAriaOneActivityNamed: `${values?.title ?? ""}`,
      dayAriaActivitiesCount: `${values?.count ?? 0}`,
      selected: "Ausgewählt",
    };
    return labels[key] ?? key;
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import ProgrammeCalendarView from "@/components/programme/ProgrammeCalendarView";
import PersonalKalenderMonthWorkspace from "@/components/admin/kalender/PersonalKalenderMonthWorkspace";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import { SCE_CALENDAR_ENGINE_DATA_REGION } from "@/lib/calendar/sce-calendar-engine";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const TZ = "Europe/Zurich";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01I-R4 — shared operational geometry", () => {
  it("Training and Match programme list rows use SceActivityListRowOperationalMetaRow", () => {
    const training = createSceTrainingCardFixtureSession({
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: "Kunstrasen 2",
        facilityResource: "Kunstrasen 2 B",
      }),
    });
    render(
      <SceTrainingCard
        model={training}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-training-list-row-operational-meta")).toBeTruthy();
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent("Kunstrasen 2 B");

    const match = resolveSceMatchCardFixture({ homeAway: "HOME" });
    render(
      <SceMatchCard
        model={match}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-match-list-row-operational-meta")).toBeTruthy();
    expect(screen.getByTestId("sce-match-list-row-time")).toBeTruthy();
    expect(screen.queryByTestId("sce-match-schedule-time")).toBeNull();
    expect(screen.getByTestId("sce-match-vs")).toBeTruthy();
  });

  it("AWAY authoritative location on operational row", () => {
    const model = resolveSceMatchCardFixture({
      homeAway: "AWAY",
      location: "Sportzentrum Tannenbrunn, Sissach - 2",
    });
    render(
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-match-list-row-location")).toHaveTextContent("- 2");
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R4 — canonical SCE Calendar Engine", () => {
  it("Team Programme calendar consumes SceCalendarEngine + MonthActivityGrid programme cells", () => {
    expect(readRelative("components/programme/ProgrammeCalendarView.tsx")).toContain(
      "SceCalendarEngine",
    );
    expect(readRelative("components/ui/calendar/SceCalendarEngine.tsx")).toContain(
      "MonthActivityGrid",
    );

    const items: ProgrammeItem[] = [];
    render(
      <ProgrammeCalendarView
        items={items}
        monthParam="2026-10"
        timeZone={TZ}
        fmtCfg={FMT}
        previousMonthHref="/prev"
        nextMonthHref="/next"
      />,
    );
    expect(screen.getByTestId("sce-calendar-engine")).toHaveAttribute(
      "data-sce-calendar-engine",
      SCE_CALENDAR_ENGINE_DATA_REGION,
    );
    expect(screen.getByTestId("programme-month-grid")).toBeTruthy();
    expect(screen.getByTestId("month-activity-grid-days")).toBeTruthy();
  });

  it("Personal /dashboard/kalender month workspace consumes SceCalendarEngine", () => {
    expect(readRelative("components/admin/kalender/PersonalKalenderMonthWorkspace.tsx")).toContain(
      "SceCalendarEngine",
    );
    render(
      <PersonalKalenderMonthWorkspace
        monthParam="2026-10"
        timeZone={TZ}
        itemsByDayKey={{}}
        timeLabelById={{}}
        navigation={{ previousMonthHref: "/p", nextMonthHref: "/n" }}
        filterLinks={[
          { key: "alle", label: "Alle", href: "/alle", active: true },
          { key: "termine", label: "Termine", href: "/termine", active: false },
          { key: "aufgaben", label: "Aufgaben", href: "/aufgaben", active: false },
        ]}
      />,
    );
    expect(screen.getByTestId("sce-calendar-engine")).toBeTruthy();
    expect(screen.getByTestId("personal-kalender-filter-alle")).toBeTruthy();
    expect(screen.getByTestId("month-activity-grid-weekdays")).toBeTruthy();
  });
});
