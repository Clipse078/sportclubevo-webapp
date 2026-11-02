/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11R2 — top-aligned semantic headers + dense training readability.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  SEMANTIC_HEADERS_TOP_ALIGNED,
  VENUE_COLUMN_BODY_ATTR,
  VENUE_COLUMN_BODY_CLASS,
  VENUE_COLUMN_BODY_MARKER,
  VENUE_COLUMN_COMPOSITION_ATTR,
  VENUE_COLUMN_COMPOSITION_MARKER,
  VENUE_COLUMN_HEADER_ATTR,
  VENUE_COLUMN_HEADER_CLASS,
  VENUE_COLUMN_HEADER_MARKER,
} from "@/lib/infoboard/venue-column-composition";
import {
  TRAINING_PARTICIPANT_PITCH_CLAMP,
  TRAINING_PARTICIPANT_TEAM_CLAMP,
  TRAINING_PITCH_NAME_MIN_READABLE_REM,
  TRAINING_TEAM_NAME_MIN_READABLE_REM,
} from "@/lib/infoboard/training-participant-density";
import {
  TOURNAMENT_MAX_PARTICIPANTS_PER_ROW,
  tournamentParticipantRowPattern,
} from "@/lib/infoboard/tournament-participant-density";
import { VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES } from "@/lib/infoboard/venue-display-grid";
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

function matchEvent(): InfoboardScreen1Event {
  return {
    ...trainingEvent(0),
    id: "m1",
    type: "MATCH",
    teamDisplayName: "FC Allschwil 1. Mannschaft",
    opponentDisplayName: "FC Nordstern",
    competitionLabel: "Meisterschaft",
    allocation: {
      pitchLabel: "KUNSTRASEN 2 A",
      homeDressingRoomLabel: "04",
      awayDressingRoomLabel: "E1",
      refereeDressingRoomLabel: null,
    },
  };
}

describe("R11R2 HEADER_COMPOSITION contract", () => {
  it("SEMANTIC_HEADERS_TOP_ALIGNED", () => {
    expect(SEMANTIC_HEADERS_TOP_ALIGNED).toBe(true);
    expect(CSS).toMatch(new RegExp(`\\.${VENUE_COLUMN_HEADER_CLASS}`));
    expect(CSS).toMatch(new RegExp(`\\.${VENUE_COLUMN_BODY_CLASS}`));
    expect(CSS).toMatch(/\.venueColumnShell[\s\S]*justify-content:\s*flex-start/);
    expect(CSS).toMatch(/\.venueColumnBody[\s\S]*justify-content:\s*center/);
  });

  it("MATCH_HEADER_IN_ACTIVITY_HEADER_REGION and MATCH_PRIMARY_REMAINS_SEPARATE", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([matchEvent()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    const composition = card.querySelector(
      `[${VENUE_COLUMN_COMPOSITION_ATTR}="${VENUE_COLUMN_COMPOSITION_MARKER}"]`,
    );
    expect(composition?.getAttribute(VENUE_COLUMN_COMPOSITION_ATTR)).toBe(
      VENUE_COLUMN_COMPOSITION_MARKER,
    );

    const header = composition?.querySelector(
      `[${VENUE_COLUMN_HEADER_ATTR}="${VENUE_COLUMN_HEADER_MARKER}"]`,
    );
    const body = composition?.querySelector(
      `[${VENUE_COLUMN_BODY_ATTR}="${VENUE_COLUMN_BODY_MARKER}"]`,
    );
    expect(header?.textContent).toMatch(/MATCH/);
    expect(body?.querySelector('[data-testid="venue-activity-primary"]')).toBeTruthy();
    expect(body?.querySelector('[data-testid="venue-match-identity"]')).toBeTruthy();
  });

  it("KABINE_HEADER_IN_HEADER_REGION and KABINE_PRIMARY_REMAINS_SEPARATE", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([matchEvent()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const kabine = screen.getByTestId("match-allocation");
    const composition = kabine.querySelector(
      `[${VENUE_COLUMN_COMPOSITION_ATTR}="${VENUE_COLUMN_COMPOSITION_MARKER}"]`,
    );
    const header = composition?.querySelector(
      `[${VENUE_COLUMN_HEADER_ATTR}="${VENUE_COLUMN_HEADER_MARKER}"]`,
    );
    const body = composition?.querySelector(
      `[${VENUE_COLUMN_BODY_ATTR}="${VENUE_COLUMN_BODY_MARKER}"]`,
    );
    expect(within(header as HTMLElement).getByText("KABINE")).toBeTruthy();
    expect(body?.textContent).toMatch(/04/);
  });

  it("PLATZ_HEADER_IN_HEADER_REGION and PLATZ_PRIMARY_REMAINS_SEPARATE", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([matchEvent()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    const pitchValue = within(card).getByTestId("pitch-value");
    const composition = pitchValue.closest(
      `[${VENUE_COLUMN_COMPOSITION_ATTR}="${VENUE_COLUMN_COMPOSITION_MARKER}"]`,
    );
    const header = composition?.querySelector(
      `[${VENUE_COLUMN_HEADER_ATTR}="${VENUE_COLUMN_HEADER_MARKER}"]`,
    );
    expect(within(header as HTMLElement).getByText("PLATZ")).toBeTruthy();
    expect(pitchValue.textContent).toMatch(/KUNSTRASEN/);
  });
});

describe("R11R2 TRAINING matrix headers", () => {
  it("SINGLE_TRAINING_HEADER_TOP and SINGLE_TRAINING_HORIZONTAL_IDENTITY", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const headers = screen.getByTestId("training-matrix-headers");
    expect(within(headers).getAllByText("TRAINING")).toHaveLength(1);
    const row = screen.getByTestId("training-matrix-row");
    expect(row.querySelector('[data-training-identity-orientation="horizontal"]')).toBeTruthy();
  });

  it("MULTI_TRAINING_HEADERS_SINGLE_INSTANCE and MULTI_TRAINING_HEADER_ROW_ALIGNED", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(Array.from({ length: 6 }, (_, i) => trainingEvent(i)))}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const headers = screen.getByTestId("training-matrix-headers");
    expect(within(headers).getAllByText("TRAINING")).toHaveLength(1);
    expect(within(headers).getAllByText("KABINE")).toHaveLength(1);
    expect(within(headers).getAllByText("PLATZ")).toHaveLength(1);
    expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(6);
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TRAINING"\] \.trainingMatrix[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\)/,
    );
  });

  it("MULTI_TRAINING_ROW_ALIGNMENT_PRESERVED", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(Array.from({ length: 4 }, (_, i) => trainingEvent(i)))}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getByTestId("training-row-matrix")).toBeTruthy();
    expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(4);
  });
});

describe("R11R2 DENSE_TRAINING_READABILITY", () => {
  const priorDenseTeamMin = 1.35;
  const priorDensePitchMin = 0.95;

  it("DENSE_TRAINING_TEAM_FONT_INCREASED", () => {
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense)).toBeGreaterThan(
      priorDenseTeamMin,
    );
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense)).toBeGreaterThanOrEqual(
      TRAINING_TEAM_NAME_MIN_READABLE_REM,
    );
    expect(parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.compact)).toBeGreaterThan(
      parseClampMinRem(TRAINING_PARTICIPANT_TEAM_CLAMP.dense),
    );
  });

  it("DENSE_TRAINING_PITCH_FONT_INCREASED", () => {
    expect(parseClampMinRem(TRAINING_PARTICIPANT_PITCH_CLAMP.dense)).toBeGreaterThan(
      priorDensePitchMin,
    );
    expect(parseClampMinRem(TRAINING_PARTICIPANT_PITCH_CLAMP.dense)).toBeGreaterThanOrEqual(
      TRAINING_PITCH_NAME_MIN_READABLE_REM,
    );
  });
});

describe("R11R2 LOCKED_INVARIANTS", () => {
  it("GRID_15_43_22_20", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
  });

  it("TOURNAMENT_MAX_PER_ROW", () => {
    expect(TOURNAMENT_MAX_PARTICIPANTS_PER_ROW).toBe(4);
    expect(tournamentParticipantRowPattern(5)).toEqual([4, 1]);
  });

  it("LIGHT_SURFACE_CONTRACT", () => {
    expect(CSS).toMatch(/--ib-zone-surface-time-match:\s*#FFF3F2/);
    expect(CSS).toMatch(/--ib-zone-surface-time-training:\s*#F1F6FD/);
    expect(CSS).toMatch(/--ib-zone-surface-time-tournament:\s*#FFF6EA/);
  });

  it("PRIMARY_IDENTITY_NO_ELLIPSIS on tournament participants", () => {
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TOURNAMENT"\] \.tournamentParticipantName[\s\S]*overflow:\s*visible/,
    );
  });

  it("CARD_HEIGHT_MODEL_UNCHANGED", () => {
    expect(CSS).toMatch(/\.eventList\[data-layout-mode="fill"\] \.eventCard/);
  });
});
