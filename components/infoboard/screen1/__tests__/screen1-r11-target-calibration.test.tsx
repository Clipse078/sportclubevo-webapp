/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11 — target design calibration regression suite.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { R11_TRAINING_IDENTITY_HORIZONTAL } from "@/lib/infoboard/training-identity-display";
import { TRAINING_SINGLE_TEAM_NAME_CLAMP } from "@/lib/infoboard/training-participant-density";
import {
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import {
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_LIGHT_TIME_SURFACE_VARS,
} from "@/lib/infoboard/venue-display-grid";
import { parseClampMinRem } from "@/lib/infoboard/venue-distance-typography";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function makeFeed(events: InfoboardScreen1Event[]): InfoboardScreen1Feed {
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
    current: [],
    next: events,
    later: [],
    isEmpty: events.length === 0,
    emptyStateReason: events.length === 0 ? "NO_EVENTS_TODAY" : null,
  };
}

function trainingEvent(index: number): InfoboardScreen1Event {
  return {
    id: `tr-${index}`,
    type: "TRAINING",
    displayTitle: "Training",
    teamDisplayName: `FC Allschwil Junioren D-${index + 7} D${index + 1}`,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-09-12T15:00:00.000Z",
    endAt: "2026-09-12T16:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: `KUNSTRASEN 3 B`,
      homeDressingRoomLabel: `E${index + 1}`,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

describe("R11_GRID_UNCHANGED", () => {
  it("R11_GRID_UNCHANGED", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES.time).toBe(15);
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES.activity).toBe(43);
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES.kabine).toBe(22);
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES.platz).toBe(20);
  });

  it("R11_CARD_HEIGHT_MODEL_UNCHANGED", () => {
    const eventCardRule = CSS.match(/\.eventCard\s*\{[^}]+\}/)?.[0] ?? "";
    expect(eventCardRule).toMatch(/flex-grow:\s*0/);
    expect(eventCardRule).not.toMatch(/height:\s*100vh/);
  });
});

describe("R11 surfaces", () => {
  it("TIME activity tints and white operational columns", () => {
    expect(CSS).toMatch(/--ib-zone-surface-time-match:\s*#FFF3F2/);
    expect(CSS).toMatch(/--ib-zone-surface-time-training:\s*#F1F6FD/);
    expect(CSS).toMatch(/--ib-zone-surface-time-tournament:\s*#FFF6EA/);
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
  });
});

describe("R11 training identity", () => {
  it("R11_TRAINING_IDENTITY_HORIZONTAL", () => {
    expect(R11_TRAINING_IDENTITY_HORIZONTAL).toBe(true);
  });

  it("R11_SINGLE_TRAINING_HORIZONTAL", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    const row = within(card).getByTestId("training-group-row");
    expect(row.getAttribute("data-training-identity-orientation")).toBe("horizontal");
    expect(within(row).getByText(/Junioren D-7 D1/i)).toBeTruthy();
    expect(within(card).queryByText(/^FC Allschwil$/i)).toBeNull();
  });

  it("R11_MULTI_TRAINING_ROW_ALIGNMENT_CONTRACT", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(Array.from({ length: 6 }, (_, i) => trainingEvent(i)))}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(6);
    for (const row of screen.getAllByTestId("training-group-row")) {
      expect(row.getAttribute("data-training-identity-orientation")).toBe("horizontal");
    }
    expect(CSS).toMatch(/\.trainingMatrixRow[\s\S]*grid-template-columns:\s*subgrid/);
  });

  it("R11_TRAINING_TEAM_NAMES_NO_PRIMARY_ELLIPSIS", () => {
    expect(CSS).toMatch(/\.trainingIdentityRow \.venueTeamDisplayName[\s\S]*overflow:\s*visible/);
    expect(CSS).toMatch(/text-overflow:\s*clip/);
  });

  it("uses XL single-team typography token", () => {
    expect(parseClampMinRem(TRAINING_SINGLE_TEAM_NAME_CLAMP)).toBeGreaterThan(2);
  });
});

describe("R11 match and tournament invariants", () => {
  it("R11_MATCH_IDENTITY_SPLIT_PRESERVED", () => {
    expect(CSS).toMatch(/data-venue-match-layout="symmetric-block"/);
    expect(CSS).toMatch(/data-match-team-label/);
  });

  it("R11_TOURNAMENT_MAX_PER_ROW", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
    expect(tournamentParticipantRowPattern(5)).toEqual([4, 1]);
    expect(tournamentParticipantRowPattern(8)).toEqual([4, 4]);
  });

  it("R11_PRIMARY_TIME_CONTAINMENT", () => {
    expect(CSS).toMatch(/\.eventTime[\s\S]*max-width:\s*100%/);
    expect(CSS).toMatch(/\.eventTime[\s\S]*white-space:\s*nowrap/);
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getByTestId("training-cohort-start-time").textContent).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("R11 alignment grammar", () => {
  it("declares venue column context / primary shell", () => {
    expect(CSS).toMatch(/\.venueColumnShell/);
    expect(CSS).toMatch(/\.venueColumnPrimary/);
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(document.querySelector('[data-venue-time-primary="true"]')).toBeTruthy();
  });
});

describe("R11_LIGHT_DARK_FEED_PARITY", () => {
  it("LIGHT and DARK share the same training row matrix contract", () => {
    for (const theme of ["LIGHT", "DARK"] as const) {
      cleanup();
      render(
        <InfoboardScreen1
          feed={makeFeed([trainingEvent(0), trainingEvent(1)])}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme={theme}
        />,
      );
      expect(screen.getAllByTestId("training-group-row")).toHaveLength(2);
    }
  });
});
