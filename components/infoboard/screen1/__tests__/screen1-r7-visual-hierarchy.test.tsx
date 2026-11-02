/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R7 — tournament max-four grid, light zone hierarchy, no-clip contract.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InfoboardScreen1,
  computeTournamentParticipantDisplayRows,
} from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import {
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  resolveTournamentParticipantGrid,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import {
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_COLUMN_MARKERS,
} from "@/lib/infoboard/venue-display-grid";
import type {
  InfoboardScreen1Feed,
  InfoboardScreen1Event,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function makeFeed(
  overrides: Partial<InfoboardScreen1Feed> = {},
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-11-01T08:00:00.000Z",
    tenant: {
      id: "tenant-generic",
      key: "generic-club",
      name: "Generic FC",
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-11-01",
    isStale: false,
    wochenplanVariantBadge: null,
    current: [],
    next: [],
    later: [],
    isEmpty: true,
    emptyStateReason: "NO_EVENTS_TODAY",
    ...overrides,
  };
}

function tournamentEvent(id: string): InfoboardScreen1Event {
  return {
    id,
    type: "TOURNAMENT",
    displayTitle: "GENERIC BLITZ CUP",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "Generic FC",
    competitionLabel: null,
    startAt: "2026-11-01T10:00:00.000Z",
    endAt: "2026-11-01T14:00:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "PLATZ 1",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

function participants(count: number): readonly InfoboardTeamAllocationPresentation[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    clubDisplayName: "FC GENERICSTADT",
    teamSubDisplayName: `JUNIOREN F${i + 1}`,
    teamDisplayName: `FC GENERICSTADT JUNIOREN F${i + 1}`,
    dressingRoomLabel: String(i + 1).padStart(2, "0"),
    clubLogoUrl: null,
  }));
}

function renderTournament(count: number) {
  const event = tournamentEvent(`t-${count}`);
  render(
    <InfoboardScreen1
      feed={makeFeed({
        next: [event],
        isEmpty: false,
        emptyStateReason: null,
      })}
      theme="LIGHT"
      currentTimeIso="2026-11-01T09:00:00.000Z"
      eventPresentation={[
        { eventId: event.id, participantAllocations: participants(count) },
      ]}
      branding={{ clubLogoSrc: "/logo.png" }}
    />,
  );
  return screen.getByTestId("tournament-participants");
}

describe("R7 tournament grid — max four per row", () => {
  it.each([
    [1, "1", 1, 1],
    [2, "2", 2, 1],
    [3, "3", 3, 1],
    [4, "4", 4, 1],
    [5, "4+1", 4, 2],
    [6, "4+2", 4, 2],
    [7, "4+3", 4, 2],
    [8, "4+4", 4, 2],
  ] as const)(
    "TOURNAMENT_%i → columns %i rows %i pattern %s",
    (count, patternLabel, columns, rows) => {
      const grid = renderTournament(count);
      expect(grid.getAttribute("data-tournament-participant-row-pattern")).toBe(
        patternLabel,
      );
      expect(
        grid.querySelectorAll('[data-tournament-participant-primary]').length,
      ).toBe(count);
      expect(grid.style.getPropertyValue("--ib-tournament-participant-columns")).toBe(
        String(columns),
      );
      expect(resolveTournamentParticipantGrid(count)).toEqual({ columns, rows });
      expect(computeTournamentParticipantDisplayRows(count)).toBe(rows);
      expect(tournamentParticipantRowPattern(count).join("+")).toBe(patternLabel);
    },
  );

  it("MAX_PARTICIPANTS_PER_ROW is four", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
  });
});

describe("R7 light zone surface contract", () => {
  it("defines R8 LIGHT zone surface tokens (TIME tint + white operational columns)", () => {
    expect(CSS).toMatch(/--ib-zone-surface-time-match:/);
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });

  it("applies zone backgrounds only under LIGHT theme", () => {
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="MATCH"\] \[data-venue-column="time"\][\s\S]*--ib-time-surface-match/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \[data-venue-column="activity"\]\.cardEventZone/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \[data-venue-column="kabine"\]\.cardDressingRoomZone/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \[data-venue-column="platz"\]\.cardPitchZone/,
    );
    expect(CSS).not.toMatch(
      /\.root\[data-theme="dark"\][\s\S]*--ib-zone-surface-time-match/,
    );
  });

  it("renders four venue column markers on a match card", () => {
    const match: InfoboardScreen1Event = {
      id: "m-r7",
      type: "MATCH",
      displayTitle: "Match",
      teamDisplayName: "FC ALLSCHWIL",
      opponentDisplayName: "FC NORDSTERN",
      opponentLogoUrl: null,
      matchPresentation: {
        home: {
          clubDisplayName: "FC ALLSCHWIL",
          teamSubDisplayName: "JUNIORINNEN FF-14",
          clubLogoUrl: "/h.png",
        },
        away: {
          clubDisplayName: "FC NORDSTERN",
          teamSubDisplayName: "BS FF14_9",
          clubLogoUrl: "/a.png",
        },
      },
      organizerDisplayName: null,
      competitionLabel: null,
      startAt: "2026-11-01T11:00:00.000Z",
      endAt: "2026-11-01T13:00:00.000Z",
      meetingTime: null,
      status: "SCHEDULED",
      resultLabel: null,
      intermediateResultLabel: null,
      temporalBucket: "next",
      seasonKey: "2026-27",
      allocation: {
        pitchLabel: "K1",
        homeDressingRoomLabel: "01",
        awayDressingRoomLabel: "02",
        refereeDressingRoomLabel: null,
      },
    };
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [match], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const row = screen.getByTestId("event-row");
    for (const column of Object.values(VENUE_ACTIVITY_COLUMN_MARKERS)) {
      expect(
        row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${column}"]`),
      ).toBeTruthy();
    }
  });
});

describe("R7 TIME hierarchy (LIGHT)", () => {
  it("styles next-activity time stack with activity-coloured label and navy dominant clock", () => {
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="MATCH"\] \[data-venue-column="time"\] \.statusLabel\[data-status="next"\]/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \[data-venue-column="time"\] \.eventTime[\s\S]*font-weight:\s*800/,
    );
  });
});

describe("R7 no-clip — primary operational identity", () => {
  it("tournament ACTIVITY participant names avoid ellipsis", () => {
    const rule = CSS.match(/\.tournamentParticipantName\s*\{[^}]+\}/)?.[0];
    expect(rule).toBeTruthy();
    expect(rule).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(rule).toMatch(/overflow:\s*visible/);
  });

  it("match primary labels avoid ellipsis", () => {
    const rule = CSS.match(
      /\.eventCard\[data-type="MATCH"\] \.matchSideBlock \.venueTeamDisplayName\s*\{[^}]+\}/,
    )?.[0];
    expect(rule).toBeTruthy();
    expect(rule).not.toMatch(/text-overflow:\s*ellipsis/);
  });
});
