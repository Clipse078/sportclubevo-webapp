/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R6 — identity hierarchy, no-clip, tournament capacity.
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
  TOURNAMENT_PARTICIPANT_DENSITY_ATTR,
  resolveTournamentParticipantDensity,
  resolveTournamentParticipantGrid,
} from "@/lib/infoboard/tournament-participant-density";
import {
  MATCH_FONT_SIZE_CSS,
  MATCH_LOGO_SIZE_CSS,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_GRID_DATA_ATTR,
  VENUE_MATCH_LAYOUT_ATTR,
  VENUE_MATCH_LAYOUT_SYMMETRIC,
} from "@/lib/infoboard/venue-display-grid";
import type {
  InfoboardScreen1Feed,
  InfoboardScreen1Event,
} from "@/lib/publishing/event-types";
import { resolveLightInlineWelcome } from "@/lib/infoboard/light-header-welcome";

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

function longNameParticipant(
  index: number,
  suffix: string,
): InfoboardTeamAllocationPresentation {
  return {
    id: `p${index}`,
    clubDisplayName: "FC GENERICSTADT",
    teamSubDisplayName: `JUNIOREN ${suffix}`,
    teamDisplayName: `FC GENERICSTADT JUNIOREN ${suffix}`,
    dressingRoomLabel: String(index).padStart(2, "0"),
    clubLogoUrl: null,
  };
}

function participants(count: number): readonly InfoboardTeamAllocationPresentation[] {
  return Array.from({ length: count }, (_, i) =>
    longNameParticipant(i + 1, `F${i + 1}`),
  );
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
      currentTimeIso="2026-11-01T09:00:00.000Z"
      eventPresentation={[
        { eventId: event.id, participantAllocations: participants(count) },
      ]}
      branding={{ clubLogoSrc: "/logo.png" }}
    />,
  );
  return screen.getByTestId("tournament-participants");
}

describe("R6 match identity hierarchy", () => {
  it("renders canonical primary and secondary lines without size tiers", () => {
    const match: InfoboardScreen1Event = {
      id: "m-hier",
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
      endAt: null,
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
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const home = screen.getByTestId("match-home-team-row");
    expect(home.textContent).toContain("FC ALLSCHWIL");
    expect(home.textContent).toContain("JUNIORINNEN FF-14");
    const primaryLabel = home.querySelector("[data-match-team-label]");
    expect(primaryLabel).toBeTruthy();
    expect(primaryLabel?.textContent).toBe("FC ALLSCHWIL");
    expect(
      screen.getByTestId("venue-match-identity").getAttribute(VENUE_MATCH_LAYOUT_ATTR),
    ).toBe(VENUE_MATCH_LAYOUT_SYMMETRIC);
    expect(screen.getByTestId("home-team-logo")).toBeTruthy();
    expect(screen.getByTestId("away-team-logo")).toBeTruthy();
  });

  it("uses reduced team-name and enlarged crest tokens relative to pre-R6 XLARGE baselines", () => {
    expect(MATCH_FONT_SIZE_CSS.XLARGE.primary).toContain("1.79rem");
    expect(MATCH_LOGO_SIZE_CSS.XLARGE).toContain("4.05rem");
  });

  it("primary match labels avoid text-overflow ellipsis in CSS", () => {
    const rule = CSS.match(
      /\.eventCard\[data-type="MATCH"\] \.matchSideBlock \.venueTeamDisplayName\s*\{[^}]+\}/,
    )?.[0];
    expect(rule).toBeTruthy();
    expect(rule).toMatch(/overflow:\s*visible/);
    expect(rule).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(rule).not.toMatch(/-webkit-line-clamp/);
  });
});

describe("R6 tournament capacity", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8] as const)(
    "renders all %i participants with density contract",
    (count) => {
      const grid = renderTournament(count);
      expect(grid.getAttribute(TOURNAMENT_PARTICIPANT_DENSITY_ATTR)).toBe(
        resolveTournamentParticipantDensity(count),
      );
      expect(
        grid.querySelectorAll('[data-tournament-participant-primary]').length,
      ).toBe(count);
      expect(
        grid.querySelectorAll('[data-testid^="tournament-participant-logo-"]').length,
      ).toBe(count);
      const { columns } = resolveTournamentParticipantGrid(count);
      expect(grid.style.getPropertyValue("--ib-tournament-participant-columns")).toBe(
        String(columns),
      );
      expect(computeTournamentParticipantDisplayRows(count)).toBe(
        resolveTournamentParticipantGrid(count).rows,
      );
    },
  );

  it("activity participant names avoid ellipsis in CSS", () => {
    const rule = CSS.match(/\.tournamentParticipantName\s*\{[^}]+\}/)?.[0];
    expect(rule).toBeTruthy();
    expect(rule).toMatch(/overflow:\s*visible/);
    expect(rule).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(rule).not.toMatch(/-webkit-line-clamp/);
    const kabineRules = [
      ...CSS.matchAll(
        /\.eventCard\[data-type="TOURNAMENT"\] \.participantTeamName\s*\{[^}]+\}/g,
      ),
    ].map((m) => m[0]);
    expect(kabineRules.length).toBeGreaterThan(0);
    const kabineRule = kabineRules[kabineRules.length - 1]!;
    expect(kabineRule).toMatch(/overflow:\s*visible/);
    expect(kabineRule).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  it("preserves locked four-column card grid", () => {
    renderTournament(4);
    const card = screen.getByTestId("event-row");
    expect(card.getAttribute(VENUE_ACTIVITY_GRID_DATA_ATTR)).toBe("true");
    expect(card.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="kabine"]`)).toBeTruthy();
    expect(card.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="platz"]`)).toBeTruthy();
  });
});

describe("R6 header welcome (LIGHT)", () => {
  it("shows full derived welcome without nowrap ellipsis styling", () => {
    const welcome = resolveLightInlineWelcome(
      "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
    );
    expect(welcome).toBe("Willkommen im Brüel");
    render(
      <InfoboardScreen1
        feed={makeFeed({
          next: [
            {
              ...tournamentEvent("solo"),
              type: "TRAINING",
              displayTitle: "Training",
              teamDisplayName: "Team A",
            },
          ],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
          showTime: true,
          showDate: true,
          showWeather: false,
        }}
      />,
    );
    const welcomeEl = screen.getByTestId("board-title-text");
    expect(welcomeEl.textContent).toBe("Willkommen im Brüel");
    expect(welcomeEl.style.whiteSpace).not.toBe("nowrap");
    expect(screen.getByTestId("kiosk-header-club-name").textContent).toContain("Generic FC");
    expect(screen.getByTestId("header-time-zone")).toBeTruthy();
    expect(screen.getByTestId("header-date-zone")).toBeTruthy();
  });
});
