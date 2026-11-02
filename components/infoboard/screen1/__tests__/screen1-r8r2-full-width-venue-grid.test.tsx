/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R8R2 — full-width venue grid geometry (Screen 1).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import {
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_COLUMN_MARKERS,
  VENUE_ACTIVITY_GRID_CANONICAL_COLUMN_COUNT,
  VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS,
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_LIGHT_TIME_SURFACE_VARS,
} from "@/lib/infoboard/venue-display-grid";
import {
  resolveTournamentParticipantGrid,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";
import {
  buildInfoboardMatchIdentityFromFixtureFields,
  resolveInfoboardMatchPresentation,
} from "@/lib/publishing/presentation/infoboard-match-presentation";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function cssBlock(selectorPrefix: string): string {
  const start = CSS.indexOf(selectorPrefix);
  if (start < 0) return "";
  const brace = CSS.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < CSS.length; i += 1) {
    if (CSS[i] === "{") depth += 1;
    if (CSS[i] === "}") {
      depth -= 1;
      if (depth === 0) return CSS.slice(start, i + 1);
    }
  }
  return CSS.slice(start);
}

function makeFeed(
  overrides: Partial<InfoboardScreen1Feed> = {},
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-11-01T08:00:00.000Z",
    tenant: {
      id: "tenant-fca",
      key: "fc-allschwil",
      name: "FC Allschwil",
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

function makeMatch(id: string): InfoboardScreen1Event {
  return {
    id,
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN FF-14",
    opponentDisplayName: "FC NORDSTERN BS FF14-9",
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
    competitionLabel: null,
    startAt: "2026-11-01T11:30:00.000Z",
    endAt: "2026-11-01T13:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KUNSTRASEN 3",
      homeDressingRoomLabel: "04",
      awayDressingRoomLabel: "E2",
      refereeDressingRoomLabel: null,
    },
  };
}

function makeTraining(id: string): InfoboardScreen1Event {
  return {
    id,
    type: "TRAINING",
    displayTitle: "Training",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN F2",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-11-01T16:00:00.000Z",
    endAt: "2026-11-01T17:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "later",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KUNSTRASEN 1",
      homeDressingRoomLabel: "05",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

function makeTournament(id: string): InfoboardScreen1Event {
  return {
    id,
    type: "TOURNAMENT",
    displayTitle: "F-BLITZTURNIER",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "FC ALLSCHWIL",
    competitionLabel: null,
    startAt: "2026-11-01T14:00:00.000Z",
    endAt: "2026-11-01T16:00:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KUNSTRASEN 2",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

function expectFourColumns(row: HTMLElement): void {
  for (const marker of Object.values(VENUE_ACTIVITY_COLUMN_MARKERS)) {
    expect(
      row.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="${marker}"]`),
    ).toBeTruthy();
  }
}

describe("R8R2 — width contract (CSS source chain)", () => {
  it("ROOT_WIDTH_SOURCE = .root width 100%", () => {
    expect(cssBlock(".root {\n  display: grid")).toMatch(/width:\s*100%/);
  });

  it("MAIN_WIDTH_SOURCE = .main consumes full inline size", () => {
    const main = cssBlock(".main {");
    expect(main).toMatch(/width:\s*100%/);
    expect(main).toMatch(/inline-size:\s*100%/);
    expect(main).toMatch(/min-width:\s*0/);
  });

  it("PAGE_ROTATOR_WIDTH_SOURCE = .pageRotator consumes full inline size", () => {
    const rotator = cssBlock(".pageRotator {");
    expect(rotator).toMatch(/width:\s*100%/);
    expect(rotator).toMatch(/inline-size:\s*100%/);
    expect(rotator).toMatch(/min-width:\s*0/);
  });

  it("EVENT_LIST_FULL_WIDTH and EVENT_CARD_FULL_WIDTH", () => {
    const list = cssBlock(".eventList {");
    expect(list).toMatch(/width:\s*100%/);
    expect(list).toMatch(/inline-size:\s*100%/);
    expect(list).toMatch(/min-width:\s*0/);

    const card = cssBlock(".eventCard {");
    expect(card).toMatch(/width:\s*100%/);
    expect(card).toMatch(/inline-size:\s*100%/);
    expect(card).toMatch(/min-width:\s*0/);
  });

  it("VENUE_GRID_FULL_WIDTH — four token columns, no fifth track", () => {
    const card = cssBlock(".eventCard {");
    expect(card).toContain(`grid-template-columns: ${VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS}`);
    expect(card).not.toMatch(/grid-template-columns:[^;]*\s1fr\s1fr\s1fr\s1fr\s1fr/);
    const trackCount = VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS.trim().split(/\s+/).length;
    expect(trackCount).toBe(VENUE_ACTIVITY_GRID_CANONICAL_COLUMN_COUNT);
  });

  it("CANONICAL_COLUMN_COUNT and zone percentages sum to 100%", () => {
    const values = Object.values(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES);
    expect(values.reduce((sum, n) => sum + n, 0)).toBe(100);
    expect(CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(CSS).toMatch(/--ib-zone-event:\s*43%/);
    expect(CSS).toMatch(/--ib-zone-room:\s*22%/);
    expect(CSS).toMatch(/--ib-zone-pitch:\s*20%/);
  });

  it("NO_UNUSED_GRID_TRACK — low-count lists use a single full-width column track", () => {
    for (const count of ["1", "2", "3"] as const) {
      expect(CSS).toMatch(
        new RegExp(
          `\\.eventList\\[data-count="${count}"\\]:not\\(\\[data-density="dense"\\]\\):not\\(\\[data-density="ultra"\\]\\)[\\s\\S]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)`,
        ),
      );
    }
  });
});

describe("R8R2 — alignment grid contract (rendered)", () => {
  function renderAllTypes() {
    const tour = makeTournament("t-1");
    render(
      <InfoboardScreen1
        feed={makeFeed({
          next: [makeMatch("m-1"), tour, makeTraining("tr-1")],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
        eventPresentation={[
          {
            eventId: "t-1",
            participantAllocations: [
              { id: "p1", teamDisplayName: "A", dressingRoomLabel: "03" },
              { id: "p2", teamDisplayName: "B", dressingRoomLabel: "03" },
              { id: "p3", teamDisplayName: "C", dressingRoomLabel: "E3" },
              { id: "p4", teamDisplayName: "D", dressingRoomLabel: "04" },
              { id: "p5", teamDisplayName: "E", dressingRoomLabel: "05" },
            ] satisfies InfoboardTeamAllocationPresentation[],
          },
        ]}
      />,
    );
  }

  it("MATCH_GRID_CONTRACT shares four columns with training and tournament", () => {
    renderAllTypes();
    const rows = screen.getAllByTestId("event-row");
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expectFourColumns(row);
    }
    expect(rows[0]?.getAttribute("data-type")).toBe("MATCH");
    expect(rows[1]?.getAttribute("data-type")).toBe("TOURNAMENT");
    expect(rows[2]?.getAttribute("data-type")).toBe("TRAINING");
  });

  it("TOURNAMENT_4_ACROSS and TOURNAMENT_5_PATTERN", () => {
    expect(resolveTournamentParticipantGrid(4).columns).toBe(4);
    expect(tournamentParticipantRowPattern(5)).toEqual([4, 1]);
  });

  it("LIGHT_SURFACE_CONTRACT — TIME tints only", () => {
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });
});

describe("R8R2 — preserves R8R1 vertical geometry", () => {
  it("equal flexible row tracks for two activities (normal density)", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="2"\]:not\(\[data-density="dense"\]\):not\(\[data-density="ultra"\]\)[\s\S]*grid-template-rows:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(CSS).not.toMatch(
      /\.eventList\[data-count="2"\][\s\S]*clamp\(280px,\s*38vh,\s*420px\)/,
    );
  });
});
