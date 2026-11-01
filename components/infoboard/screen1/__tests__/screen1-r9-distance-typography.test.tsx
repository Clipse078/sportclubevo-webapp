/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R9 — distance typography & activity composition (Screen 1).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import {
  MICRO_TEXT_AUDIT,
  R8_VENUE_TIME_PRIMARY_BASELINE,
  R8_VENUE_VS_LABEL_BASELINE,
  parseClampMinRem,
  r9TimePrimaryExceedsR8Baseline,
  r9VsLabelExceedsR8Baseline,
  resolveVenueDistanceEventListCssVars,
  resolveVenueDistanceTimePrimary,
  resolveVenueDistanceTimeSecondary,
  VENUE_DISTANCE_VS_LABEL,
} from "@/lib/infoboard/venue-distance-typography";
import {
  VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS,
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_LIGHT_TIME_SURFACE_VARS,
  VENUE_MATCH_VERSUS_ATTR,
  VENUE_MATCH_VERSUS_DISPLAY_CLASS,
} from "@/lib/infoboard/venue-display-grid";
import {
  resolveTournamentParticipantGrid,
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
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
    id: "m-r9",
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN FF-14",
    opponentDisplayName: "FC NORDSTERN BS FF14-9",
    opponentLogoUrl: null,
    matchPresentation,
    organizerDisplayName: null,
    competitionLabel: "Juniorinnen FF-17",
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

describe("R9 TIME_SCALE", () => {
  it("TIME_PRIMARY_SCALE exceeds R8 baseline for spacious pages", () => {
    expect(r9TimePrimaryExceedsR8Baseline(1)).toBe(true);
    expect(r9TimePrimaryExceedsR8Baseline(2)).toBe(true);
    expect(parseClampMinRem(R8_VENUE_TIME_PRIMARY_BASELINE)).toBeLessThan(
      parseClampMinRem(resolveVenueDistanceTimePrimary(1)),
    );
  });

  it("TIME_SECONDARY_SCALE stays below TIME_PRIMARY_SCALE", () => {
    for (const count of [1, 2, 3, 4, 5, 6] as const) {
      expect(parseClampMinRem(resolveVenueDistanceTimeSecondary(count))).toBeLessThan(
        parseClampMinRem(resolveVenueDistanceTimePrimary(count)),
      );
    }
  });

  it("applies canonical distance tokens on the event list", () => {
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
    const list = screen.getByTestId("event-list");
    const style = list.style as CSSStyleDeclaration & Record<string, string>;
    const primary = style.getPropertyValue("--ib-fs-event-time");
    const secondary = style.getPropertyValue("--ib-fs-event-end-time");
    expect(parseClampMinRem(primary)).toBeGreaterThan(
      parseClampMinRem(resolveVenueDistanceTimePrimary(1)),
    );
    expect(parseClampMinRem(secondary)).toBeGreaterThan(
      parseClampMinRem(resolveVenueDistanceTimeSecondary(1)),
    );
    expect(parseClampMinRem(primary)).toBeGreaterThan(
      parseClampMinRem(R8_VENUE_TIME_PRIMARY_BASELINE),
    );
  });

  it("DENSITY_BEHAVIOUR scales standard below spacious for the same count", () => {
    const spacious = resolveVenueDistanceEventListCssVars("spacious", 1);
    const standard = resolveVenueDistanceEventListCssVars("standard", 3);
    expect(parseClampMinRem(spacious["--ib-fs-event-time"])).toBeGreaterThan(
      parseClampMinRem(standard["--ib-fs-event-time"]),
    );
  });
});

describe("R9 MATCH_IDENTITY", () => {
  const structuredSides = {
    home: {
      clubDisplayName: "FC ALLSCHWIL",
      teamSubDisplayName: "JUNIOREN FF-17",
      clubLogoUrl: "/h.png",
    },
    away: {
      clubDisplayName: "FC NORDSTERN",
      teamSubDisplayName: "BS FF17 A",
      clubLogoUrl: "/a.png",
    },
  } as const;

  it("MATCH_IDENTITY_SPLIT with club and team sublines on both sides", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [matchWithPresentation(structuredSides)], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const home = screen.getByTestId("match-home-team-row");
    const away = screen.getByTestId("match-away-team-row");
    expect(home.querySelector("[data-match-team-label]")?.textContent).toBe("FC ALLSCHWIL");
    expect(home.textContent).toContain("JUNIOREN FF-17");
    expect(away.querySelector("[data-match-team-label]")?.textContent).toBe("FC NORDSTERN");
    expect(away.textContent).toContain("BS FF17 A");
  });

  it("MATCH_VS_SCALE_INCREASED versus R8 baseline", () => {
    expect(r9VsLabelExceedsR8Baseline()).toBe(true);
    expect(parseClampMinRem(VENUE_DISTANCE_VS_LABEL)).toBeGreaterThan(
      parseClampMinRem(R8_VENUE_VS_LABEL_BASELINE),
    );
    expect(CSS).toMatch(/--ib-fs-vs-label:[\s\S]*2\.05rem/);
  });

  it("MATCH_VS presentation marker and display class", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [matchWithPresentation(structuredSides)], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const vs = screen.getByTestId("venue-match-vs");
    expect(vs.getAttribute(VENUE_MATCH_VERSUS_ATTR)).toBe("true");
    expect(vs.className).toContain(VENUE_MATCH_VERSUS_DISPLAY_CLASS);
  });

  it("MATCH_CREST_DOMINANT — logo slot uses match logo size token", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [matchWithPresentation(structuredSides)], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const card = screen.getByTestId("match-home-team-row").closest("li") as HTMLElement;
    const logoSize = card.style.getPropertyValue("--ib-match-logo-size");
    expect(logoSize.length).toBeGreaterThan(0);
    expect(CSS).toMatch(/\.matchClubLogo[\s\S]*var\(--ib-match-logo-size\)/);
  });
});

describe("R9 TOURNAMENT_IDENTITY", () => {
  it("TOURNAMENT_MAX_PER_ROW = 4 and capacity model unchanged", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
    expect(tournamentParticipantRowPattern(5).join("+")).toBe("4+1");
    expect(resolveTournamentParticipantGrid(8).columns).toBe(4);
  });

  it("TOURNAMENT_IDENTITY_HIERARCHY — crest, club, team subline", () => {
    const event: InfoboardScreen1Event = {
      id: "t-r9",
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
        pitchLabel: "KUNSTRASEN 2",
        homeDressingRoomLabel: null,
        awayDressingRoomLabel: null,
        refereeDressingRoomLabel: null,
      },
    };
    const allocations: InfoboardTeamAllocationPresentation[] = [
      {
        id: "p1",
        clubDisplayName: "FC ALLSCHWIL",
        teamSubDisplayName: "JUNIOREN F1",
        teamDisplayName: "FC ALLSCHWIL JUNIOREN F1",
        dressingRoomLabel: "03",
        clubLogoUrl: null,
      },
    ];
    render(
      <InfoboardScreen1
        feed={makeFeed({ next: [event], isEmpty: false, emptyStateReason: null })}
        theme="LIGHT"
        currentTimeIso="2026-11-01T09:00:00.000Z"
        eventPresentation={[{ eventId: event.id, participantAllocations: allocations }]}
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const participant = screen.getByTestId("tournament-participant-p1");
    expect(participant.querySelector("[data-tournament-participant-primary]")?.textContent).toBe(
      "FC ALLSCHWIL",
    );
    expect(participant.querySelector("[data-tournament-participant-secondary]")?.textContent).toBe(
      "JUNIOREN F1",
    );
  });
});

describe("R9 surfaces and grid invariants", () => {
  it("TIME_ONLY_TINTED — activity/kabine/platz stay white", () => {
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });

  it("FULL_WIDTH_GRID_PRESERVED", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 12,
      activity: 45,
      kabine: 22,
      platz: 21,
    });
    expect(VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS).toContain("var(--ib-zone-time)");
    expect(CSS).toMatch(/--ib-zone-time:\s*12%/);
  });

  it("R8R1_VERTICAL_GEOMETRY_PRESERVED — low-count equal row distribution", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\]:not\(\[data-density="dense"\]\)[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\)/,
    );
  });

  it("KABINE_ROOM_PRIMARY — room number precedes team identity", () => {
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
    const kabine = screen.getByTestId("match-allocation");
    expect(kabine.textContent).toMatch(/04[\s\S]*Heim/);
  });

  it("R9 single-activity composition anchors primary zone to flex-start", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\][\s\S]*\.activityPrimaryZone[\s\S]*justify-content:\s*flex-start/,
    );
  });
});

describe("R9 MICRO_TEXT_AUDIT export", () => {
  it("documents minimum readable tiers without enlarging decorative micro copy", () => {
    expect(MICRO_TEXT_AUDIT.PRIMARY_MIN_FONT).toContain("clamp(");
    expect(MICRO_TEXT_AUDIT.SECONDARY_MIN_FONT).toContain("clamp(");
    expect(MICRO_TEXT_AUDIT.REMAINING_MICRO_TEXT.length).toBeGreaterThan(0);
    expect(MICRO_TEXT_AUDIT.RATIONALE).toContain("R9");
  });
});
