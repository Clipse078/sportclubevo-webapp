/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11R1 — semantic labels, vertical composition, training readability.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  VENUE_SEMANTIC_LABEL_ATTR,
  VENUE_SEMANTIC_LABEL_COLORS,
} from "@/lib/infoboard/venue-semantic-label";
import {
  VENUE_COLUMN_COMPOSITION_ATTR,
  VENUE_COLUMN_COMPOSITION_CLASS,
  VENUE_COLUMN_COMPOSITION_MARKER,
} from "@/lib/infoboard/venue-column-composition";
import {
  TRAINING_PARTICIPANT_TEAM_CLAMP,
  TRAINING_TEAM_NAME_MIN_READABLE_REM,
} from "@/lib/infoboard/training-participant-density";
import {
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import {
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
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
      pitchLabel: `KUNSTRASEN 2 A`,
      homeDressingRoomLabel: `E${index + 1}`,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

describe("R11R1 SEMANTIC_LABEL_FAMILY", () => {
  it("renders unified semantic badges for TRAINING / KABINE / PLATZ", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    for (const kind of ["TRAINING", "KABINE", "PLATZ"] as const) {
      const badge = within(card).getByText(kind);
      expect(badge.getAttribute(VENUE_SEMANTIC_LABEL_ATTR)).toBe(kind);
      expect(badge.className).toMatch(/venueSemanticLabel/);
      expect(badge.className).toMatch(/eventTypeLabel/);
    }
  });
});

describe("R11R1 SEMANTIC_COLORS (CSS)", () => {
  it("declares badge colours for all five semantic labels", () => {
    expect(CSS).toMatch(new RegExp(VENUE_SEMANTIC_LABEL_COLORS.KABINE.replace("#", "#")));
    expect(CSS).toMatch(/data-semantic-label="KABINE"/);
    expect(CSS).toMatch(/data-semantic-label="PLATZ"/);
    expect(CSS).toMatch(/data-event-type="MATCH"/);
    expect(CSS).toMatch(/data-semantic-label="TRAINING"/);
    expect(CSS).toMatch(/data-semantic-label="TURNIER"/);
  });
});

describe("R11R1 VERTICAL_COMPOSITION", () => {
  it("uses venueColumnComposition in CSS and DOM for destination columns", () => {
    expect(CSS).toMatch(new RegExp(`\\.${VENUE_COLUMN_COMPOSITION_CLASS}`));
    expect(CSS).toMatch(/\.venueColumnShell[\s\S]*justify-content:\s*flex-start/);
    expect(CSS).toMatch(/\.trainingRowMatrix[\s\S]*align-content:\s*center/);
    const match: InfoboardScreen1Event = {
      ...trainingEvent(0),
      id: "m1",
      type: "MATCH",
      teamDisplayName: "FC Allschwil 1. Mannschaft",
      opponentDisplayName: "FC Nordstern",
      allocation: {
        pitchLabel: "KUNSTRASEN 2 A",
        homeDressingRoomLabel: "04",
        awayDressingRoomLabel: "05",
        refereeDressingRoomLabel: null,
      },
    };
    render(
      <InfoboardScreen1
        feed={makeFeed([match])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    expect(
      card.querySelector(
        `[${VENUE_COLUMN_COMPOSITION_ATTR}="${VENUE_COLUMN_COMPOSITION_MARKER}"]`,
      ),
    ).toBeTruthy();
  });
});

describe("R11R1 TRAINING_READABILITY", () => {
  it("dense team token meets minimum readable scale", () => {
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense)).toBeGreaterThanOrEqual(
      TRAINING_TEAM_NAME_MIN_READABLE_REM,
    );
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.standard)).toBeGreaterThan(
      parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense),
    );
  });

  it("MULTI_TRAINING_ORIENTATION horizontal rows", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(Array.from({ length: 6 }, (_, i) => trainingEvent(i)))}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    for (const row of screen.getAllByTestId("training-group-row")) {
      expect(row.getAttribute("data-training-identity-orientation")).toBe("horizontal");
    }
  });
});

describe("R11R1 LOCKED_INVARIANTS", () => {
  it("GRID_INVARIANT", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
  });

  it("TOURNAMENT_CAPACITY", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
    expect(tournamentParticipantRowPattern(5)).toEqual([4, 1]);
  });

  it("TIME_SURFACE_CONTRACT", () => {
    expect(CSS).toMatch(/--ib-zone-surface-time-match:\s*#FFF3F2/);
    expect(CSS).toMatch(/--ib-zone-surface-time-training:\s*#F1F6FD/);
    expect(CSS).toMatch(/--ib-zone-surface-time-tournament:\s*#FFF6EA/);
  });
});
