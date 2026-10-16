/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SceTournamentCard } from "@/components/sporting-activity/SceTournamentCard";
import { SceClubEventCard } from "@/components/sporting-activity/SceClubEventCard";
import { PersonalProgrammeCanonicalAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow";
import { PersonalDashboardWorkspace } from "@/components/ui/dashboard/PersonalDashboardWorkspace";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { buildMeinProgrammKalenderOpenHref } from "@/lib/personal-agenda/mein-programm-url";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "de-CH",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01J R4A — three-row programme card contract", () => {
  it("TRAINING operational list row: row1 identity+crest, row2 team, row3 time+location", () => {
    const model = createSceTrainingCardFixtureSession({
      trainingTitle: "Training",
      team: { name: "Junioren B1" },
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: "https://cdn.example/fca.png",
      }),
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: "Im Brüel",
        facilityResource: "Kunstrasen 2",
      }),
    });

    render(
      <SceTrainingCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="operational"
        linkToDetail={false}
      />,
    );

    const root = screen.getByTestId("sce-training-list-row-primary-identity");
    expect(root).toBeTruthy();
    expect(screen.getByTestId("sce-training-title")).toHaveTextContent("Training");
    expect(screen.getByTestId("sce-training-team")).toHaveTextContent("Junioren B1");
    expect(screen.getByTestId("sce-training-list-row-time")).toBeTruthy();
    expect(screen.getByTestId("sce-training-list-row-location")).toHaveTextContent(/Im Brüel/i);
  });

  it("MATCH programme-fixture: home left, away right, crests, row2 team, kickoff-only row3", () => {
    const model = resolveSceMatchCardFixture({
      homeAway: "HOME",
      endAt: new Date("2026-10-13T20:15:00.000Z"),
      operationalEndAt: new Date("2026-10-13T20:15:00.000Z"),
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

    const fixture = screen.getByTestId("sce-match-fixture");
    const home = fixture.querySelector('[data-sce-match-side="home"]');
    const away = fixture.querySelector('[data-sce-match-side="away"]');
    expect(home?.compareDocumentPosition(away!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("sce-match-list-row-team-context")).toHaveTextContent("Junioren B1");
    const time = screen.getByTestId("sce-match-list-row-time");
    expect(time.textContent).not.toMatch(/–/);
  });

  it("TOURNAMENT operational: title+crest row1, teams row2, time+location row3", () => {
    render(
      <SceTournamentCard
        model={{
          kind: "TOURNAMENT",
          activityId: "to1",
          resourceKey: "tournament:to1",
          typeLabel: "Turnier",
          tournamentTitle: "PlayMore Turnier",
          organiser: {
            displayName: "FC Allschwil",
            logoUrl: "https://cdn.example/fca.png",
            fallbackIdentity: { kind: "initials", label: "FC" },
          },
          ownTeams: ["Junioren F2", "Junioren F3"],
          schedule: {
            startAt: "2026-10-11T08:00:00.000Z",
            endAt: "2026-10-11T10:00:00.000Z",
          },
          location: buildSportingActivityLocation({
            mode: "NEUTRAL",
            venueName: "Im Brüel",
            facilityResource: "Kunstrasen 2",
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

    expect(screen.getByTestId("sce-tournament-list-row-primary-identity")).toBeTruthy();
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent(/Junioren F2/);
    expect(screen.getByTestId("sce-tournament-list-row-time")).toBeTruthy();
    expect(screen.getByTestId("sce-tournament-list-row-location")).toBeTruthy();
  });

  it("CLUB EVENT operational: title+crest row1, audience row2, time+location row3", () => {
    render(
      <SceClubEventCard
        model={{
          kind: "CLUB_EVENT",
          activityId: "e1",
          resourceKey: "club-event:e1",
          typeLabel: "Veranstaltung",
          eventTitle: "Vereinsversammlung",
          organiser: {
            displayName: "FC Allschwil",
            logoUrl: "https://cdn.example/fca.png",
            fallbackIdentity: { kind: "initials", label: "FC" },
          },
          audience: {
            kind: "ORG_UNIT",
            primaryLabel: "Vereinsleitung",
            detailLabel: null,
          },
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

    expect(screen.getByTestId("sce-club-event-list-row-primary-identity")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-organiser-crest")).toBeTruthy();
    expect(screen.getByTestId("sce-club-event-audience")).toHaveTextContent("Vereinsleitung");
    expect(screen.getByTestId("sce-club-event-list-row-time")).toBeTruthy();
  });

  it("dashboard canonical row uses programme-fixture for matches (not dashboard-opponent fork)", () => {
    const canonical = readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
    expect(canonical).toContain('listRowPresentation="programme-fixture"');
    expect(canonical).not.toContain('listRowPresentation="dashboard-opponent"');
    expect(canonical).not.toMatch(/Dashboard(Match|Training|Tournament|ClubEvent)Card/);

    const matchModel = resolveSceMatchCardFixture({ homeAway: "HOME" });
    const item: PersonalProgrammeItem = {
      id: "event:match-1",
      sourceType: "MATCH",
      startsAt: new Date("2026-10-17T18:45:00.000Z"),
      title: "Spiel",
      typeLabel: "Spiel",
      deepLink: "/dashboard/matchcenter/match-1",
      ariaLabel: "Spiel",
      canonicalPresentation: matchModel,
      programmeScopeTeamId: "team-1",
    };

    render(<PersonalProgrammeCanonicalAgendaRow item={item} />);
    expect(screen.getByTestId("sce-match-fixture")).toBeTruthy();
    expect(screen.queryByTestId("sce-match-dashboard-agenda-identity")).toBeNull();
  });
});

describe("SCE-ACTIVITY-CREATE-01J R4B — Dashboard Mein Kalender adoption", () => {
  it("opens canonical Mein Programm calendar route", () => {
    expect(buildMeinProgrammKalenderOpenHref("2026-10")).toBe(
      "/dashboard/mein-programm?ansicht=kalender&monat=2026-10",
    );
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("buildMeinProgrammKalenderOpenHref");
    expect(workspace).not.toContain("/dashboard/kalender?monat=");
  });

  it("keeps selected-day agenda removed and uses PersonalProgrammeMonthCalendar pipeline", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("PersonalProgrammeMonthCalendar");
    expect(workspace).toContain("showSelectedDayPanel={false}");
    expect(workspace).not.toContain("DashboardCalendarEngine");
  });

  it("only syncs programme scroll when selected day is in preview groups", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("previewDayKeys");
    expect(workspace).toContain("previewDayKeys.has(selectedDayKey)");
  });

  it("renders cockpit calendar open link with canonical href", () => {
    render(
      <PersonalDashboardWorkspace
        groups={[]}
        programmeItems={[]}
        programmeSupported
        timeLabelById={{}}
        monthParam="2026-10"
        timeZone="Europe/Zurich"
        navigation={{
          previousMonthHref: "#prev",
          nextMonthHref: "#next",
          todayHref: "#today",
        }}
      />,
    );
    const link = screen.getByTestId("personal-calendar-open");
    expect(link.getAttribute("href")).toBe("/dashboard/mein-programm?ansicht=kalender&monat=2026-10");
  });
});
