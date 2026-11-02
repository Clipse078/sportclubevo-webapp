/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R10 — unified activity composition, match identity, training grammar.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InfoboardScreen1,
  trainingGroupDensityTier,
} from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  resolveTrainingParticipantDensity,
  TRAINING_PARTICIPANT_DENSITY_ATTR,
} from "@/lib/infoboard/training-participant-density";
import {
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_LIGHT_TIME_SURFACE_VARS,
} from "@/lib/infoboard/venue-display-grid";
import {
  resolveTournamentParticipantGrid,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import {
  resolveInfoboardMatchPresentation,
  type InfoboardMatchIdentity,
} from "@/lib/publishing/presentation/infoboard-match-presentation";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function makeFeed(
  events: InfoboardScreen1Event[],
  bucket: "current" | "next" = "next",
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-09-12T08:00:00.000Z",
    tenant: {
      id: "tenant-1",
      key: "fc-allschwil",
      name: "FC Allschwil",
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-09-12",
    isStale: false,
    wochenplanVariantBadge: null,
    current: bucket === "current" ? events : [],
    next: bucket === "next" ? events : [],
    later: [],
    isEmpty: events.length === 0,
    emptyStateReason: events.length === 0 ? "NO_EVENTS_TODAY" : null,
  };
}

function makeMatchEvent(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
  return {
    id: "m1",
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC Allschwil",
    opponentDisplayName: "FC Opponent",
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-09-12T10:30:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "STADION",
      homeDressingRoomLabel: "E1",
      awayDressingRoomLabel: "E2",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

describe("R10 TIME_GEOMETRY", () => {
  it("canonical zone percentages sum to 100% with collision-safe TIME width", () => {
    const { time, activity, kabine, platz } = VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES;
    expect(time + activity + kabine + platz).toBe(100);
    expect(time).toBe(15);
    expect(CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(CSS).toMatch(/\.cardTimeZone[\s\S]*min-width:\s*0/);
    expect(CSS).toMatch(/\.eventTime[\s\S]*max-width:\s*100%/);
  });

  it("preserves fixture start times in TIME column", () => {
    const cases = [
      { label: "11:30", startAt: "2026-09-12T09:30:00.000Z" },
      { label: "15:00", startAt: "2026-09-12T13:00:00.000Z" },
    ] as const;
    for (const { label, startAt } of cases) {
      cleanup();
      render(
        <InfoboardScreen1
          feed={makeFeed([makeMatchEvent({ startAt })])}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme="LIGHT"
        />,
      );
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

describe("R10 MATCH_IDENTITY", () => {
  function presentationFromIdentity(identity: InfoboardMatchIdentity) {
    return resolveInfoboardMatchPresentation(
      identity,
      "https://cdn.example.com/fca.png",
      "FC Allschwil",
    );
  }

  it("splits FCA Juniorinnen FF-14 into club + team lines", () => {
    const presentation = presentationFromIdentity({
      home: {
        isOwnTeam: true,
        clubName: null,
        clubLogoUrl: null,
        teamName: "FC Allschwil Juniorinnen FF-14",
        teamShortName: "FF-14",
        teamAlternativeName: "Juniorinnen FF-14",
        teamInfoboardDisplayName: "JUNIORINNEN FF-14",
        teamInfoboardMatchDisplayName: null,
        fallbackDisplayName: "FC Allschwil Juniorinnen FF-14",
      },
      away: {
        isOwnTeam: false,
        clubName: "FC Nordstern",
        clubLogoUrl: null,
        teamName: "FC Nordstern BS FF14-9",
        teamShortName: "BS FF14-9",
        teamAlternativeName: null,
        teamInfoboardDisplayName: null,
        teamInfoboardMatchDisplayName: null,
        fallbackDisplayName: "FC Nordstern BS FF14-9",
      },
    });

    expect(presentation?.home.clubDisplayName).toBe("FC Allschwil");
    expect(presentation?.home.teamSubDisplayName).toBe("JUNIORINNEN FF-14");
    expect(presentation?.away?.clubDisplayName).toBe("FC Nordstern");
    expect(presentation?.away?.teamSubDisplayName).toBe("BS FF14-9");
  });

  it("splits Junioren D-9 D2 fixture without flattened club line", () => {
    const presentation = presentationFromIdentity({
      home: {
        isOwnTeam: true,
        clubName: null,
        clubLogoUrl: null,
        teamName: "FC Allschwil Junioren D-9 D2",
        teamShortName: "D-9 D2",
        teamAlternativeName: "Junioren D-9 D2",
        teamInfoboardDisplayName: "JUNIOREN D-9 D2",
        teamInfoboardMatchDisplayName: null,
        fallbackDisplayName: "FC Allschwil Junioren D-9 D2",
      },
      away: {
        isOwnTeam: false,
        clubName: "SC Dornach",
        clubLogoUrl: null,
        teamName: "SC Dornach Schwarz",
        teamShortName: "SCHWARZ",
        teamAlternativeName: null,
        teamInfoboardDisplayName: null,
        teamInfoboardMatchDisplayName: null,
        fallbackDisplayName: "SC Dornach Schwarz",
      },
    });

    expect(presentation?.home.clubDisplayName).toBe("FC Allschwil");
    expect(presentation?.home.teamSubDisplayName).toBe("JUNIOREN D-9 D2");
    expect(presentation?.away?.clubDisplayName).toBe("SC Dornach");
    expect(presentation?.away?.teamSubDisplayName).toBe("SCHWARZ");
  });

  it("renders separate semantic elements on Screen 1", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([
          makeMatchEvent({
            matchPresentation: {
              home: {
                clubDisplayName: "FC Allschwil",
                teamSubDisplayName: "JUNIORINNEN FF-14",
                clubLogoUrl: "https://cdn.example.com/fca.png",
              },
              away: {
                clubDisplayName: "FC Nordstern",
                teamSubDisplayName: "BS FF14-9",
                clubLogoUrl: null,
              },
            },
          }),
        ])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );

    const home = screen.getByTestId("match-home-team-row");
    expect(within(home).getByText("FC Allschwil")).toBeTruthy();
    expect(within(home).getByText("JUNIORINNEN FF-14")).toBeTruthy();
    expect(home.textContent).not.toMatch(/FC Allschwil FF-14/);
  });
});

describe("R10 TRAINING", () => {
  function trainingAt(count: number) {
    const items = Array.from({ length: count }, (_, index) =>
      makeMatchEvent({
        id: `t${index}`,
        type: "TRAINING",
        teamDisplayName: `JUNIOREN D-${index + 7} D${index + 1}`,
        opponentDisplayName: null,
        matchPresentation: null,
        allocation: {
          pitchLabel: `KUNSTRASEN ${index + 1}`,
          homeDressingRoomLabel: `E${index + 3}`,
          awayDressingRoomLabel: null,
          refereeDressingRoomLabel: null,
        },
      }),
    );
    return makeFeed(items);
  }

  it("uses club + team hierarchy for single-team training", () => {
    render(
      <InfoboardScreen1
        feed={trainingAt(1)}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getByTestId("training-group-row")).toBeTruthy();
    expect(screen.getByText(/JUNIOREN D-7 D1/i)).toBeTruthy();
  });

  it("preserves all teams and row alignment contract for 5/6 cohorts", () => {
    for (const count of [5, 6] as const) {
      cleanup();
      render(
        <InfoboardScreen1
          feed={trainingAt(count)}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme="LIGHT"
        />,
      );
      expect(screen.getAllByTestId("training-group-row")).toHaveLength(count);
      expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(count);
      expect(trainingGroupDensityTier(count)).toBe("compact");
      expect(resolveTrainingParticipantDensity(count)).toBe("compact");
    }
  });

  it("does not ellipsis primary training identity", () => {
    expect(CSS).toMatch(/\.trainingIdentityRow \{[\s\S]*?min-width:\s*0;/);
    expect(CSS).toMatch(/\.trainingGroupTeamName[\s\S]*overflow:\s*visible/);
  });
});

describe("R10 TOURNAMENT", () => {
  it("preserves max-four row pattern", () => {
    expect(resolveTournamentParticipantGrid(5).columns).toBe(4);
    expect(tournamentParticipantRowPattern(5)).toEqual([4, 1]);
    expect(tournamentParticipantRowPattern(6)).toEqual([4, 2]);
  });
});

describe("R10 SURFACES", () => {
  it("TIME-only tint invariant", () => {
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
  });
});

describe("R10 PARITY", () => {
  it("LIGHT/DARK feed structure parity for match card", () => {
    const feed = makeFeed([
      makeMatchEvent({
        matchPresentation: {
          home: {
            clubDisplayName: "FC Allschwil",
            teamSubDisplayName: "JUNIOREN E1",
            clubLogoUrl: null,
          },
          away: {
            clubDisplayName: "FC Rival",
            teamSubDisplayName: null,
            clubLogoUrl: null,
          },
        },
      }),
    ]);
    const { unmount: unmountLight } = render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const lightCount = screen.getAllByTestId("event-row").length;
    unmountLight();
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="DARK"
      />,
    );
    expect(screen.getAllByTestId("event-row").length).toBe(lightCount);
  });
});
