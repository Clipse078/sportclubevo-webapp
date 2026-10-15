/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      legendTraining: "Training",
      legendMatch: "Spiel",
      legendTournament: "Turnier",
      legendEvent: "Veranstaltung",
      legendAria: "Aktivitätstypen",
    };
    return labels[key] ?? key;
  },
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import ProgrammeCalendarView from "@/components/programme/ProgrammeCalendarView";
import ProgrammeSceActivityCard from "@/components/programme/ProgrammeSceActivityCard";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { loadTrainingSessionFacilityHints } from "@/lib/sporting-activity-presentation/training-facility-batch";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveSceTrainingPresentationFromLegacy } from "@/lib/sporting-activity-presentation/canonical/adapters/training";
import { buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const TZ = "Europe/Zurich";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function trainingProgrammeItem(): ProgrammeItem {
  const legacy = buildTrainingActivityPresentation({
    resourceKey: "training-session:t1",
    title: "Junioren B1 Training",
    typeLabel: "Training",
    teamName: "FC Allschwil Junioren B1",
    clubName: "FC Allschwil",
    startAt: new Date("2026-10-20T16:45:00.000Z"),
    endAt: new Date("2026-10-20T18:15:00.000Z"),
    facilityName: "Im Brüel",
    pitchResourceName: "KR2",
    dressingRoomName: "Garderobe 4",
  });
  const presentation = resolveSceTrainingPresentationFromLegacy(legacy);
  return {
    id: "training-2010",
    kind: "TRAINING",
    domainId: "t1",
    resourceKey: "training-session:t1",
    startsAt: new Date("2026-10-20T16:45:00.000Z"),
    endsAt: new Date("2026-10-20T18:15:00.000Z"),
    allDay: false,
    presentation,
    teamId: "team-1",
    teamSeasonId: "ts-1",
    orgUnitId: null,
    navigationTarget: "/dashboard/activity/training-session/t1",
  };
}

describe("SCE-ACTIVITY-CREATE-01I-R3 — Programme Training card", () => {
  it("A: Programme uses canonical SceTrainingCard with operational list row", () => {
    const source = readRelative("components/programme/ProgrammeSceActivityCard.tsx");
    expect(source).toContain("SceTrainingCard");
    expect(source).toContain('listRowPresentation="operational"');

    const item = trainingProgrammeItem();
    render(<ProgrammeSceActivityCard item={item} fmtCfg={FMT} />);
    expect(screen.getByTestId("programme-sce-training-t1")).toBeTruthy();
    expect(screen.getByTestId("sce-training-list-row-time")).toBeTruthy();
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent("Im Brüel · KR2");
    expect(screen.getByTestId("sce-training-list-row-dressing-room")).toHaveTextContent("Garderobe 4");
  });

  it("B–G: time, location, dressing room, status, and no empty dressing placeholder", () => {
    const withRoom = createSceTrainingCardFixtureSession({
      dressingRoom: { label: "Garderobe 4" },
    });
    const { rerender } = render(
      <SceTrainingCard
        model={withRoom}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-training-list-row-time")).toHaveTextContent("18:45");
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent("Im Brüel · KR2");
    expect(screen.getByTestId("sce-training-list-row-dressing-room")).toBeTruthy();

    rerender(
      <SceTrainingCard
        model={createSceTrainingCardFixtureSession()}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );
    expect(screen.queryByTestId("sce-training-list-row-dressing-room")).toBeNull();
  });

  it("H: facility hints resolve in batch (single loader entry point)", () => {
    const source = readRelative("lib/programme-engine/load-programme-sources.ts");
    const batchIdx = source.indexOf("await loadTrainingSessionFacilityHints");
    const loopIdx = source.indexOf("for (const session of sessions)");
    expect(batchIdx).toBeGreaterThan(-1);
    expect(loopIdx).toBeGreaterThan(batchIdx);
    expect(typeof loadTrainingSessionFacilityHints).toBe("function");
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R3 — Programme Match card", () => {
  it("canonical SceMatchCard programme fixture composition", () => {
    const model = resolveSceMatchCardFixture({ homeAway: "HOME" });
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
    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(fixture.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(screen.getByTestId("sce-match-schedule-time")).toBeTruthy();
    expect(screen.getByTestId("sce-match-vs")).toBeTruthy();
  });

  it("AWAY location suffix integrity in presentation model", () => {
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
    expect(screen.getByTestId("sce-match-location")).toHaveTextContent("- 2");
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R3 — Tournament and Club Event cards", () => {
  it("tournament operational list row surfaces title, organiser context, time, location", () => {
    render(
      <SceTournamentCard
        model={{
          kind: "TOURNAMENT",
          activityId: "to1",
          resourceKey: "tournament:to1",
          typeLabel: "Turnier",
          tournamentTitle: "Herbstcup",
          organiser: {
            displayName: "FC Allschwil",
            logoUrl: null,
            fallbackIdentity: { kind: "initials", label: "FC" },
          },
          hauptteam: { name: "Junioren B1" },
          schedule: {
            startAt: "2026-10-11T07:30:00.000Z",
            endAt: "2026-10-11T15:00:00.000Z",
          },
          location: buildSportingActivityLocation({
            mode: "NEUTRAL",
            venueName: "Sportanlage",
            facilityResource: "Platz 1",
          }),
          route: { resourceKey: "tournament:to1", consumeHref: "/t", manageHref: null },
        }}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-tournament-title")).toHaveTextContent("Herbstcup");
    expect(screen.getByTestId("sce-tournament-list-row-time")).toBeTruthy();
    expect(screen.getByTestId("sce-tournament-list-row-location")).toBeTruthy();
    expect(screen.queryByTestId("sce-match-vs")).toBeNull();
  });

  it("club event operational list row surfaces title, time, location", () => {
    render(
      <SceClubEventCard
        model={{
          kind: "CLUB_EVENT",
          activityId: "e1",
          resourceKey: "club-event:e1",
          typeLabel: "Veranstaltung",
          eventTitle: "118. Mitgliederversammlung",
          schedule: {
            startAt: "2026-10-05T17:30:00.000Z",
            endAt: "2026-10-05T19:00:00.000Z",
          },
          location: buildSportingActivityLocation({
            mode: "HOME",
            venueName: "Clubhaus",
          }),
          route: { resourceKey: "club-event:e1", consumeHref: "/e", manageHref: null },
        }}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );
    expect(screen.getByTestId("sce-club-event-title")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-list-row-time")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-list-row-location")).toHaveTextContent("Clubhaus");
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R3 — Calendar legend", () => {
  function octoberItems(): ProgrammeItem[] {
    return [
      trainingProgrammeItem(),
      {
        id: "match-1710",
        kind: "MATCH",
        domainId: "m1",
        resourceKey: "match:m1",
        startsAt: new Date("2026-10-17T12:00:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: resolveSceMatchCardFixture({
          startAt: new Date("2026-10-17T12:00:00.000Z"),
          homeAway: "HOME",
        }),
        teamId: null,
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/m1",
      },
    ];
  }

  it("legend lives in calendar header, outside weekdays and date grid", () => {
    render(
      <ProgrammeCalendarView
        items={octoberItems()}
        monthParam="2026-10"
        timeZone={TZ}
        fmtCfg={FMT}
        previousMonthHref="/prev"
        nextMonthHref="/next"
      />,
    );

    const header = screen.getByTestId("month-activity-grid-header");
    const legend = screen.getByTestId("month-activity-grid-legend");
    const weekdays = screen.getByTestId("month-activity-grid-weekdays");
    const grid = screen.getByTestId("month-activity-grid-days");
    const mondayCell = screen.getByTestId("programme-calendar-day-2026-10-05");

    expect(header).toContainElement(legend);
    expect(weekdays).not.toContainElement(legend);
    expect(grid).not.toContainElement(legend);
    expect(mondayCell).not.toContainElement(legend);

    for (const label of ["Training", "Spiel", "Turnier", "Veranstaltung"]) {
      expect(within(legend).getByText(label)).toBeTruthy();
    }
    expect(within(weekdays).getByTestId("month-activity-grid-weekday-Mo")).toHaveTextContent("Mo");
  });

  it("October micro entries remain on training day", () => {
    render(
      <ProgrammeCalendarView
        items={octoberItems()}
        monthParam="2026-10"
        timeZone={TZ}
        fmtCfg={FMT}
        previousMonthHref="/prev"
        nextMonthHref="/next"
      />,
    );
    expect(screen.getByTestId("programme-calendar-entry-training-2010")).toBeTruthy();
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R3 — Liste / Kalender contract", () => {
  it("shared ProgrammeItem[] contract without second calendar query", () => {
    const calendar = readRelative("components/programme/ProgrammeCalendarView.tsx");
    const liste = readRelative("components/programme/ProgrammeListeView.tsx");
    expect(calendar).toContain("items: ProgrammeItem[]");
    expect(liste).toContain("items: ProgrammeItem[]");
    expect(calendar).not.toContain("queryProgramme");
    expect(liste).not.toContain("queryProgramme");
  });
});
