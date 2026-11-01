/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01 — unified venue activity grid regression coverage.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import {
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_COLUMN_MARKERS,
  VENUE_ACTIVITY_CONTENT_TOP_CLASS,
  VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS,
  VENUE_ACTIVITY_GRID_ZONE_WIDTHS,
  VENUE_ACTIVITY_ZONE_ATTR,
  VENUE_ACTIVITY_ZONE_CONTEXT,
  VENUE_ACTIVITY_ZONE_PRIMARY,
  VENUE_MATCH_LAYOUT_ATTR,
  VENUE_MATCH_LAYOUT_SYMMETRIC,
} from "@/lib/infoboard/venue-display-grid";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import {
  buildInfoboardMatchIdentityFromFixtureFields,
  resolveInfoboardMatchPresentation,
} from "@/lib/publishing/presentation/infoboard-match-presentation";

const CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeFeed(events: {
  current?: InfoboardScreen1Event[];
  next?: InfoboardScreen1Event[];
}) {
  return {
    tenant: { id: "t1", name: "FC Allschwil", timezone: "Europe/Zurich" },
    displayDate: "2026-11-01",
    generatedAt: "2026-11-01T08:00:00.000Z",
    isEmpty: false,
    emptyStateReason: null as const,
    current: events.current ?? [],
    next: events.next ?? [],
    later: [],
  };
}

function makeMatch(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "match-1",
    type: "MATCH",
    displayTitle: "FC ALLSCHWIL vs FC NORDSTERN",
    teamDisplayName: "FC ALLSCHWIL",
    opponentDisplayName: "FC NORDSTERN",
    opponentLogoUrl: null,
    matchPresentation: resolveInfoboardMatchPresentation(
      buildInfoboardMatchIdentityFromFixtureFields({
        homeAway: "HOME",
        team: null,
        teamDisplayName: "FC ALLSCHWIL",
        opponentDisplayName: "FC NORDSTERN",
        opponentLogoUrl: "/away.png",
      }),
      null,
      null,
    ),
    organizerDisplayName: null,
    competitionLabel: "Juniorinnen FF-14 (9v9)",
    startAt: "2026-11-01T10:30:00.000Z",
    endAt: "2026-11-01T12:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 3",
      homeDressingRoomLabel: "04",
      awayDressingRoomLabel: "E2",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function makeTraining(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "training-1",
    type: "TRAINING",
    displayTitle: "JUNIOREN F2",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN F2",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-11-01T14:00:00.000Z",
    endAt: "2026-11-01T15:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "later",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 1",
      homeDressingRoomLabel: "05",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function makeTournament(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "tournament-1",
    type: "TOURNAMENT",
    displayTitle: "F-BLITZTURNIER",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "FC ALLSCHWIL",
    competitionLabel: "Turnier",
    startAt: "2026-11-01T11:00:00.000Z",
    endAt: "2026-11-01T13:00:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KR 2",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function kabineAllocations(): readonly InfoboardTeamAllocationPresentation[] {
  return [
    { id: "p1", teamDisplayName: "FCA Junioren F1", dressingRoomLabel: "03" },
    { id: "p2", teamDisplayName: "FCA Junioren F2", dressingRoomLabel: "03" },
    { id: "p3", teamDisplayName: "SC Binningen", dressingRoomLabel: "E3" },
  ];
}

afterEach(() => {
  cleanup();
});

describe("SCE-INFOBOARD-V2-01 venue activity grid contract", () => {
  it("exports identical column width tokens for all zones", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_WIDTHS.time).toBe("var(--ib-zone-time)");
    expect(VENUE_ACTIVITY_GRID_ZONE_WIDTHS.kabine).toBe("var(--ib-zone-room)");
    expect(VENUE_ACTIVITY_GRID_ZONE_WIDTHS.platz).toBe("var(--ib-zone-pitch)");
    expect(CSS).toContain(`grid-template-columns: ${VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS}`);
  });

  function expectCanonicalColumnsOnRow(row: HTMLElement): void {
    expect(
      row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.time}"]`),
    ).toBeTruthy();
    expect(
      row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.identity}"]`,
      ),
    ).toBeTruthy();
    expect(
      row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.kabine}"]`,
      ),
    ).toBeTruthy();
    expect(
      row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.platz}"]`,
      ),
    ).toBeTruthy();
    expect(row.getAttribute("data-venue-activity-grid")).toBe("true");
  }

  it("MATCH and TOURNAMENT cards expose the four canonical columns", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [makeMatch()],
          next: [makeTournament()],
        })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        eventPresentation={[
          {
            eventId: "tournament-1",
            participantAllocations: kabineAllocations(),
          },
        ]}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    for (const row of screen.getAllByTestId("event-row")) {
      expectCanonicalColumnsOnRow(row);
    }
  });

  it("TRAINING cards expose the four canonical columns", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeTraining()] })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expectCanonicalColumnsOnRow(screen.getByTestId("event-row"));
  });

  it("keeps Kabine and Platz columns when assignments are missing", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [
            makeMatch({
              allocation: {
                pitchLabel: null,
                homeDressingRoomLabel: null,
                awayDressingRoomLabel: null,
                refereeDressingRoomLabel: null,
              },
            }),
          ],
        })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const row = screen.getByTestId("event-row");
    expect(
      row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.kabine}"]`),
    ).toBeTruthy();
    expect(
      row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.platz}"]`),
    ).toBeTruthy();
    expect(screen.getAllByTestId("dressing-room-unassigned-warning").length).toBeGreaterThan(0);
    expect(screen.getByTestId("pitch-unassigned-warning")).toBeTruthy();
  });

  it("does not fabricate match semantics on training cards", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeTraining()] })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const row = screen.getByTestId("event-row");
    expect(row.textContent).toContain("TRAINING");
    expect(row.textContent?.toLowerCase()).not.toContain("vs.");
    expect(screen.queryByTestId("match-away-team-row")).toBeNull();
  });

  it("does not fabricate tournament as match-up", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeTournament()] })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        eventPresentation={[
          { eventId: "tournament-1", participantAllocations: kabineAllocations() },
        ]}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const row = screen.getByTestId("event-row");
    expect(row.textContent).toContain("TURNIER");
    expect(screen.queryByTestId("match-home-team-row")).toBeNull();
    expect(
      row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.platz}"]`)
        ?.textContent,
    ).toContain("KR 2");
  });

  it("renders match participant identity with crest rows", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeMatch()] })}
        branding={BRANDING}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expect(screen.getByTestId("match-home-team-row")).toBeTruthy();
    expect(screen.getByTestId("match-away-team-row")).toBeTruthy();
    expect(screen.getByTestId("away-team-logo")).toBeTruthy();
  });

  it("uses tenant branding dynamically without hardcoded club names in grid primitives", () => {
    render(
      <InfoboardScreen1
        feed={{
          ...makeFeed({ current: [makeTraining()] }),
          tenant: { id: "t2", name: "SC Examplestadt", timezone: "Europe/Zurich" },
        }}
        branding={{ clubLogoSrc: "/tenant.png", productLogoSrc: BRANDING.productLogoSrc }}
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expect(screen.getByTestId("kiosk-header-club-name").textContent).toContain("SC Examplestadt");
  });

  it("MATCH_IDENTITY: symmetric blocks with crest above name and central VS without kickoff time", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeMatch()] })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const row = screen.getByTestId("event-row");
    const matchIdentity = screen.getByTestId("venue-match-identity");
    expect(matchIdentity.getAttribute(VENUE_MATCH_LAYOUT_ATTR)).toBe(
      VENUE_MATCH_LAYOUT_SYMMETRIC,
    );
    expect(screen.getByTestId("venue-match-vs").textContent).toContain("VS");

    const homeRow = screen.getByTestId("match-home-team-row");
    const awayRow = screen.getByTestId("match-away-team-row");
    const crestSelector =
      '[data-testid="home-team-logo"], [data-testid="home-team-logo-placeholder"]';
    const awayCrestSelector =
      '[data-testid="away-team-logo"], [data-testid="away-team-logo-placeholder"]';
    expect(homeRow.children[0]?.querySelector(crestSelector)).toBeTruthy();
    expect(homeRow.children[1]?.querySelector("[data-match-team-label]")).toBeTruthy();
    expect(awayRow.children[0]?.querySelector(awayCrestSelector)).toBeTruthy();
    expect(awayRow.children[1]?.querySelector("[data-match-team-label]")).toBeTruthy();

    const timeZone = row.querySelector(
      `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.time}"]`,
    );
    expect(timeZone?.textContent).toMatch(/10:30|11:30/);
    expect(matchIdentity.textContent).not.toMatch(/\b10:30\b|\b11:30\b/);
  });

  it("TEAM_TYPOGRAPHY: both sides share venueTeamDisplayName without per-side size tiers", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [
            makeMatch({
              matchPresentation: resolveInfoboardMatchPresentation(
                buildInfoboardMatchIdentityFromFixtureFields({
                  homeAway: "HOME",
                  team: null,
                  teamDisplayName: "FC ALLSCHWIL SENIOREN 50+ EXTRA LONG",
                  opponentDisplayName: "FC NORDSTERN",
                  opponentLogoUrl: "/away.png",
                }),
                null,
                null,
              ),
            }),
          ],
        })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const homeLabel = screen
      .getByTestId("match-home-team-row")
      .querySelector("[data-match-team-label]") as HTMLElement;
    const awayLabel = screen
      .getByTestId("match-away-team-row")
      .querySelector("[data-match-team-label]") as HTMLElement;

    expect(homeLabel.className).toContain("venueTeamDisplayName");
    expect(awayLabel.className).toContain("venueTeamDisplayName");
    expect(homeLabel.getAttribute("data-match-name-size")).toBeNull();
    expect(awayLabel.getAttribute("data-match-name-size")).toBeNull();
    expect(CSS).toMatch(
      /\.eventCard\[data-type="MATCH"\] \.matchSideBlock \.venueTeamDisplayName[\s\S]*font-size:\s*var\(--ib-match-font-size\)/,
    );
    expect(CSS).toMatch(/\.venueTeamDisplayName[\s\S]*font-style:\s*italic/);
  });

  it("MATCH_SYMMETRY: equal-width identity containers and shared crest bounding boxes", () => {
    expect(CSS).toMatch(/\.matchSideBlock[\s\S]*align-items:\s*center/);
    expect(CSS).toMatch(
      /\.matchIdentity\[data-venue-match-layout="symmetric-block"\][\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*minmax\(0,\s*1fr\)/,
    );
    expect(CSS).toMatch(/\.matchCrestSlot[\s\S]*width:\s*var\(--ib-match-logo-size\)/);
    expect(CSS).toMatch(/\.matchClubLogo[\s\S]*object-fit:\s*contain/);
  });

  it("ACTIVITY_STRUCTURE: context header zone and primary presentation zone", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeMatch()] })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const context = screen.getByTestId("venue-activity-context");
    const primary = screen.getByTestId("venue-activity-primary");
    expect(context.getAttribute(VENUE_ACTIVITY_ZONE_ATTR)).toBe(
      VENUE_ACTIVITY_ZONE_CONTEXT,
    );
    expect(primary.getAttribute(VENUE_ACTIVITY_ZONE_ATTR)).toBe(
      VENUE_ACTIVITY_ZONE_PRIMARY,
    );
    expect(context.compareDocumentPosition(primary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(context.textContent).toContain("MATCH");
    expect(primary.querySelector("[data-testid='venue-match-identity']")).toBeTruthy();
  });

  it("TOURNAMENT_IDENTITY: participant name under crest in equal-width blocks", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeTournament()] })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        eventPresentation={[
          {
            eventId: "tournament-1",
            participantAllocations: kabineAllocations(),
          },
        ]}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const participants = screen.getByTestId("tournament-participants");
    expect(participants.className).toContain("tournamentParticipantBlocks");
    expect(CSS).toMatch(/\.tournamentParticipantBlocks[\s\S]*grid-template-columns:/);

    const firstBlock = screen.getByTestId("tournament-participant-p1");
    expect(firstBlock.children[0]?.querySelector("img, span[aria-hidden='true']")).toBeTruthy();
    expect(firstBlock.textContent).toContain("FCA Junioren F1");
  });

  it("ACTIVITY, KABINE and PLATZ share the top-alignment contract on each card", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [makeMatch()],
          next: [makeTournament()],
        })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        eventPresentation={[
          {
            eventId: "tournament-1",
            participantAllocations: kabineAllocations(),
          },
        ]}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expect(CSS).toContain(`.${VENUE_ACTIVITY_CONTENT_TOP_CLASS}`);
    expect(CSS).toMatch(
      /\.venueActivityContentTop[\s\S]*justify-content:\s*flex-start/,
    );
    expect(CSS).toMatch(
      /SCE-INFOBOARD-V2-01-R3[\s\S]*justify-content:\s*flex-start/,
    );

    for (const row of screen.getAllByTestId("event-row")) {
      const activity = row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.identity}"]`,
      );
      const kabine = row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.kabine}"]`,
      );
      const platz = row.querySelector(
        `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.platz}"]`,
      );
      for (const zone of [activity, kabine, platz]) {
        expect(zone?.className).toContain(VENUE_ACTIVITY_CONTENT_TOP_CLASS);
      }
    }
  });

  it("light theme enables venue page heading without hardcoded facility strings", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ current: [makeMatch()] })}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "Willkommen auf der Anlage",
          pageHeadingText: "HEUTE AUF DER ANLAGE",
        }}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expect(screen.getByTestId("venue-page-heading").textContent).toContain(
      "HEUTE AUF DER ANLAGE",
    );
    expect(screen.queryByTestId("board-title")).toBeNull();
  });
});
