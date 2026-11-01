/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R8 — target design calibration (LIGHT surfaces, identity, VS, alignment).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import {
  VENUE_ACTIVITY_CONTENT_TOP_VAR,
  VENUE_ACTIVITY_CONTENT_TOP_CLASS,
  VENUE_LIGHT_TIME_SURFACE_VARS,
  VENUE_MATCH_VERSUS_ATTR,
  VENUE_MATCH_VERSUS_DISPLAY_CLASS,
} from "@/lib/infoboard/venue-display-grid";
import {
  resolveTournamentParticipantGrid,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import {
  enrichMatchIdentityWithTenant,
  resolveInfoboardMatchPresentation,
  type InfoboardMatchIdentity,
} from "@/lib/publishing/presentation/infoboard-match-presentation";
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

function matchWithPresentation(
  matchPresentation: NonNullable<InfoboardScreen1Event["matchPresentation"]>,
): InfoboardScreen1Event {
  return {
    id: "m-r8",
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN FF-14",
    opponentDisplayName: "FC NORDSTERN BS FF14-9",
    opponentLogoUrl: null,
    matchPresentation,
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

describe("R8 LIGHT zone surfaces", () => {
  it("defines TIME activity tints and white operational columns", () => {
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });

  it("applies per-type TIME tint only under LIGHT theme", () => {
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="MATCH"\] \[data-venue-column="time"\][\s\S]*--ib-zone-surface-time-match/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="TRAINING"\] \[data-venue-column="time"\][\s\S]*--ib-zone-surface-time-training/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="TOURNAMENT"\] \[data-venue-column="time"\][\s\S]*--ib-zone-surface-time-tournament/,
    );
    expect(CSS).not.toMatch(
      /\.root\[data-theme="dark"\][\s\S]*--ib-zone-surface-time-match/,
    );
  });
});

describe("R8 match identity — tenant club + team split", () => {
  const structuredSides = {
    home: {
      clubDisplayName: "FC ALLSCHWIL",
      teamSubDisplayName: "JUNIOREN FF-14",
      clubLogoUrl: "/h.png",
    },
    away: {
      clubDisplayName: "FC NORDSTERN",
      teamSubDisplayName: "BS FF14-9",
      clubLogoUrl: "/a.png",
    },
  } as const;

  it("HOME_IDENTITY_STRUCTURE renders split primary and secondary lines", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [matchWithPresentation(structuredSides)], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const home = screen.getByTestId("match-home-team-row");
    expect(home.querySelector("[data-match-team-label]")?.textContent).toBe("FC ALLSCHWIL");
    expect(home.textContent).toContain("JUNIOREN FF-14");
    expect(home.textContent).not.toMatch(/FC ALLSCHWIL\s+JUNIOREN FF-14/);
  });

  it("AWAY_IDENTITY_STRUCTURE preserves opponent split", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [matchWithPresentation(structuredSides)], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const away = screen.getByTestId("match-away-team-row");
    expect(away.textContent).toContain("FC NORDSTERN");
    expect(away.textContent).toContain("BS FF14-9");
  });

  it("TENANT_HOME_TEST — resolver splits tenant team on home side", () => {
    const identity: InfoboardMatchIdentity = enrichMatchIdentityWithTenant(
      {
        home: {
          isOwnTeam: true,
          clubName: "FC Allschwil",
          clubLogoUrl: null,
          teamName: "Junioren FF-14",
          teamShortName: "FF-14",
          teamAlternativeName: "Junioren FF-14",
          teamInfoboardDisplayName: null,
          teamInfoboardMatchDisplayName: null,
          fallbackDisplayName: "FC Allschwil Junioren FF-14",
        },
        away: {
          isOwnTeam: false,
          clubName: "FC Nordstern",
          clubLogoUrl: null,
          teamName: "BS FF14-9",
          teamShortName: "BS FF14-9",
          teamAlternativeName: null,
          teamInfoboardDisplayName: null,
          teamInfoboardMatchDisplayName: null,
          fallbackDisplayName: "FC Nordstern BS FF14-9",
        },
      },
      "FC Allschwil",
    );
    const presentation = resolveInfoboardMatchPresentation(
      identity,
      "/tenant.png",
      "FC Allschwil",
    );
    expect(presentation?.home.clubDisplayName).toBe("FC Allschwil");
    expect(presentation?.home.teamSubDisplayName).toBe("Junioren FF-14");
  });

  it("TENANT_AWAY_TEST — resolver splits tenant team on away side", () => {
    const identity: InfoboardMatchIdentity = enrichMatchIdentityWithTenant(
      {
        home: {
          isOwnTeam: false,
          clubName: "FC Binningen",
          clubLogoUrl: null,
          teamName: "1. Mannschaft",
          teamShortName: null,
          teamAlternativeName: null,
          teamInfoboardDisplayName: null,
          teamInfoboardMatchDisplayName: null,
          fallbackDisplayName: "FC Binningen",
        },
        away: {
          isOwnTeam: true,
          clubName: "FC Allschwil",
          clubLogoUrl: null,
          teamName: "Junioren D-9 D2",
          teamShortName: "D-9 D2",
          teamAlternativeName: "Junioren D-9 D2",
          teamInfoboardDisplayName: null,
          teamInfoboardMatchDisplayName: null,
          fallbackDisplayName: "FC Allschwil Junioren D-9 D2",
        },
      },
      "FC Allschwil",
    );
    const presentation = resolveInfoboardMatchPresentation(
      identity,
      "/tenant.png",
      "FC Allschwil",
    );
    expect(presentation?.away?.clubDisplayName).toBe("FC Allschwil");
    expect(presentation?.away?.teamSubDisplayName).toBe("Junioren D-9 D2");
  });
});

describe("R8 VS presentation", () => {
  it("VS_PRESENTATION uses semantic marker and R8 display class with readable size token", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          next: [
            matchWithPresentation({
              home: {
                clubDisplayName: "FC ALLSCHWIL",
                teamSubDisplayName: "JUNIOREN FF-14",
                clubLogoUrl: "/h.png",
              },
              away: {
                clubDisplayName: "FC NORDSTERN",
                teamSubDisplayName: "BS FF14-9",
                clubLogoUrl: "/a.png",
              },
            }),
          ],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const vs = screen.getByTestId("venue-match-vs");
    expect(vs.getAttribute(VENUE_MATCH_VERSUS_ATTR)).toBe("true");
    expect(vs.className).toContain(VENUE_MATCH_VERSUS_DISPLAY_CLASS);
    expect(CSS).toMatch(/\.matchVersusLabel[\s\S]*font-weight:\s*800/);
    expect(CSS).toMatch(/--ib-fs-vs-label:[\s\S]*1\.65rem/);
  });
});

describe("R8 alignment contract", () => {
  it("SHARED_TOP_TOKEN anchors all venue columns", () => {
    expect(CSS).toMatch(new RegExp(`${VENUE_ACTIVITY_CONTENT_TOP_VAR}:`));
    expect(CSS).toMatch(
      new RegExp(
        `\\.root\\[data-theme="light"\\][\\s\\S]*padding-top:\\s*var\\(${VENUE_ACTIVITY_CONTENT_TOP_VAR}\\)`,
      ),
    );
    expect(CSS).toMatch(
      new RegExp(
        `\\.${VENUE_ACTIVITY_CONTENT_TOP_CLASS}[\\s\\S]*padding-top:\\s*var\\(${VENUE_ACTIVITY_CONTENT_TOP_VAR}`,
      ),
    );
  });
});

describe("R8 tournament capacity (unchanged canonical model)", () => {
  it.each([
    [4, "4", 4],
    [5, "4+1", 4],
    [6, "4+2", 4],
    [7, "4+3", 4],
    [8, "4+4", 4],
  ] as const)("participants %i → pattern %s max columns %i", (count, pattern, columns) => {
    expect(tournamentParticipantRowPattern(count).join("+")).toBe(pattern);
    expect(resolveTournamentParticipantGrid(count).columns).toBe(columns);
  });
});

describe("R8 no-clip — primary identity selectors", () => {
  it("PRIMARY match and tournament ACTIVITY labels avoid ellipsis", () => {
    const matchRule = CSS.match(
      /\.eventCard\[data-type="MATCH"\] \.matchSideBlock \.venueTeamDisplayName\s*\{[^}]+\}/,
    )?.[0];
    expect(matchRule).toBeTruthy();
    expect(matchRule).not.toMatch(/text-overflow:\s*ellipsis/);

    const tournamentRule = CSS.match(/\.tournamentParticipantName\s*\{[^}]+\}/)?.[0];
    expect(tournamentRule).toBeTruthy();
    expect(tournamentRule).not.toMatch(/text-overflow:\s*ellipsis/);
  });
});

describe("R8 tournament kabine identity split", () => {
  function kabineAllocations(): InfoboardTeamAllocationPresentation[] {
    return [
      {
        id: "p1",
        clubDisplayName: "FC ALLSCHWIL",
        teamSubDisplayName: "JUNIOREN F1",
        teamDisplayName: "FC ALLSCHWIL JUNIOREN F1",
        dressingRoomLabel: "03",
        clubLogoUrl: null,
      },
    ];
  }

  it("renders kabine assignment with club and team lines", () => {
    const event: InfoboardScreen1Event = {
      id: "t-kabine",
      type: "TOURNAMENT",
      displayTitle: "F-BLITZTURNIER",
      teamDisplayName: null,
      opponentDisplayName: null,
      opponentLogoUrl: null,
      matchPresentation: null,
      organizerDisplayName: null,
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
        pitchLabel: "KUNSTRASEN 3",
        homeDressingRoomLabel: null,
        awayDressingRoomLabel: null,
        refereeDressingRoomLabel: null,
      },
    };
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [event], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        eventPresentation={[
          { eventId: event.id, participantAllocations: kabineAllocations() },
        ]}
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const kabine = screen.getByTestId("participant-allocation-block");
    expect(kabine.querySelector("[data-kabine-team-primary]")?.textContent).toBe(
      "FC ALLSCHWIL",
    );
    expect(kabine.querySelector("[data-kabine-team-secondary]")?.textContent).toBe(
      "JUNIOREN F1",
    );
  });
});
