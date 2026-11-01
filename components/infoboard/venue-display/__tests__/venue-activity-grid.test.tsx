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
  VENUE_MATCH_LAYOUT_ATTR,
  VENUE_MATCH_LAYOUT_HORIZONTAL,
  VENUE_TEAM_TYPOGRAPHY_ATTR,
  VENUE_TEAM_TYPOGRAPHY_PRIMARY,
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

  it("MATCH uses horizontal presentation with website team typography and VS without duplicate time", () => {
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
    const horizontal = screen.getByTestId("venue-match-horizontal");
    expect(horizontal.getAttribute(VENUE_MATCH_LAYOUT_ATTR)).toBe(
      VENUE_MATCH_LAYOUT_HORIZONTAL,
    );
    expect(screen.getByTestId("match-home-team-row")).toBeTruthy();
    expect(screen.getByTestId("match-away-team-row")).toBeTruthy();
    expect(screen.getByTestId("venue-match-vs").textContent).toContain("VS");

    const primaryLabels = row.querySelectorAll(
      `[${VENUE_TEAM_TYPOGRAPHY_ATTR}="${VENUE_TEAM_TYPOGRAPHY_PRIMARY}"]`,
    );
    expect(primaryLabels.length).toBeGreaterThanOrEqual(2);

    const timeZone = row.querySelector(
      `[${VENUE_ACTIVITY_COLUMN_ATTR}="${VENUE_ACTIVITY_COLUMN_MARKERS.time}"]`,
    );
    expect(timeZone?.textContent).toMatch(/10:30|11:30/);
    expect(horizontal.textContent).not.toMatch(/\b10:30\b|\b11:30\b/);
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
