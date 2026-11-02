/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11R3 — stable TIME composition + training identity scale.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  TIME_COLUMN_BODY_ATTR,
  TIME_COLUMN_BODY_MARKER,
  TIME_COLUMN_COMPOSITION_ATTR,
  TIME_COLUMN_COMPOSITION_MARKER,
  TIME_COLUMN_HEADER_ATTR,
  TIME_COLUMN_HEADER_MARKER,
  VENUE_COLUMN_BODY_ATTR,
  VENUE_COLUMN_BODY_CLASS,
  VENUE_COLUMN_HEADER_ATTR,
} from "@/lib/infoboard/venue-column-composition";
import {
  TRAINING_DENSITY_CHANGES_IDENTITY_SCALE,
  TRAINING_DENSITY_MAY_COMPRESS_WHITESPACE,
  TRAINING_IDENTITY_CREST_SIZE_VAR,
  TRAINING_PARTICIPANT_ROW_GAP,
  TRAINING_TEAM_NAME_SIZE_VAR,
} from "@/lib/infoboard/training-participant-density";
import { DEFAULT_SCREEN1_PRESENTATION } from "@/lib/infoboard/screen1-logo-settings";
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

function tournamentEvent(): InfoboardScreen1Event {
  return {
    ...trainingEvent(0),
    id: "t1",
    type: "TOURNAMENT",
    displayTitle: "Sommerturnier",
    organizerDisplayName: "FC Allschwil",
    allocation: {
      pitchLabel: "KUNSTRASEN 1",
      homeDressingRoomLabel: "E1",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

function trainingCardStyle(participantCount: number): string {
  cleanup();
  render(
    <InfoboardScreen1
      feed={makeFeed(Array.from({ length: participantCount }, (_, i) => trainingEvent(i)))}
      currentTimeIso="2026-09-12T08:00:00.000Z"
      theme="LIGHT"
      presentation={{ ...DEFAULT_SCREEN1_PRESENTATION, trainingShowLogos: true }}
      branding={{ clubLogoSrc: "/logo.png" }}
    />,
  );
  const card = screen.getByTestId("event-row") as HTMLElement;
  return {
    crest: card.style.getPropertyValue(TRAINING_IDENTITY_CREST_SIZE_VAR),
    team: card.style.getPropertyValue(TRAINING_TEAM_NAME_SIZE_VAR),
  };
}

describe("R11R3 TIME_HEADER_BODY_CONTRACT", () => {
  it("structural TIME header/body CSS mirrors venue columns", () => {
    expect(CSS).toMatch(
      /\.cardTimeZone\.venueColumnShell \.venueColumnComposition[\s\S]*flex:\s*1 1 auto/,
    );
    expect(CSS).toMatch(new RegExp(`\\.${VENUE_COLUMN_BODY_CLASS}[\\s\\S]*justify-content:\\s*center`));
  });

  it("ALS NÄCHSTES lives in TIME header; clock lives in centred body (training)", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent(0)])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const timeZone = screen.getByTestId("training-group-time-zone");
    const composition = timeZone.querySelector(
      `[${TIME_COLUMN_COMPOSITION_ATTR}="${TIME_COLUMN_COMPOSITION_MARKER}"]`,
    );
    expect(composition).toBeTruthy();
    const header = timeZone.querySelector(
      `[${TIME_COLUMN_HEADER_ATTR}="${TIME_COLUMN_HEADER_MARKER}"]`,
    );
    const body = timeZone.querySelector(
      `[${TIME_COLUMN_BODY_ATTR}="${TIME_COLUMN_BODY_MARKER}"]`,
    );
    expect(header).toBeTruthy();
    expect(body).toBeTruthy();
    expect(within(header as HTMLElement).getByText("ALS NÄCHSTES")).toBeTruthy();
    expect(within(body as HTMLElement).getByTestId("training-cohort-start-time")).toBeTruthy();
    expect(body?.querySelector('[data-venue-time-primary="true"]')).toBeTruthy();
  });

  it("match and tournament share the TIME body model", () => {
    for (const event of [matchEvent(), tournamentEvent()]) {
      cleanup();
      render(
        <InfoboardScreen1
          feed={makeFeed([event])}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme="LIGHT"
        />,
      );
      const timeZone = screen.getByTestId("venue-activity-time");
      expect(
        timeZone.querySelector(
          `[${TIME_COLUMN_COMPOSITION_ATTR}="${TIME_COLUMN_COMPOSITION_MARKER}"]`,
        ),
      ).toBeTruthy();
      expect(
        timeZone.querySelector(`[${VENUE_COLUMN_HEADER_ATTR}="${TIME_COLUMN_HEADER_MARKER}"]`),
      ).toBeTruthy();
      expect(
        timeZone.querySelector(`[${VENUE_COLUMN_BODY_ATTR}="${TIME_COLUMN_BODY_MARKER}"]`),
      ).toBeTruthy();
    }
  });
});

describe("R11R3 TRAINING identity invariants", () => {
  it("TRAINING_DENSITY_CHANGES_IDENTITY_SCALE = FALSE", () => {
    expect(TRAINING_DENSITY_CHANGES_IDENTITY_SCALE).toBe(false);
  });

  it("TRAINING_DENSITY_MAY_COMPRESS_WHITESPACE = TRUE", () => {
    expect(TRAINING_DENSITY_MAY_COMPRESS_WHITESPACE).toBe(true);
    expect(TRAINING_PARTICIPANT_ROW_GAP.dense).not.toBe(TRAINING_PARTICIPANT_ROW_GAP.spacious);
  });

  it("TRAINING_CREST_SIZE_INVARIANT for participant counts 1–6", () => {
    const crestValues = new Set<string>();
    for (let count = 1; count <= 6; count += 1) {
      const { crest } = trainingCardStyle(count);
      expect(crest.length).toBeGreaterThan(0);
      crestValues.add(crest);
    }
    expect(crestValues.size).toBe(1);
  });

  it("TRAINING_TEAM_FONT_SIZE_INVARIANT for participant counts 1–6", () => {
    const teamValues = new Set<string>();
    for (let count = 1; count <= 6; count += 1) {
      const { team } = trainingCardStyle(count);
      expect(team.length).toBeGreaterThan(0);
      teamValues.add(team);
    }
    expect(teamValues.size).toBe(1);
    expect([...teamValues][0]!.length).toBeGreaterThan(0);
  });
});

describe("R11R3 DENSE_6_TEAM_CONTAINMENT", () => {
  it("renders six identity, crest, team, kabine, and platz rows without ellipsis", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(Array.from({ length: 6 }, (_, i) => trainingEvent(i)))}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
        presentation={{ ...DEFAULT_SCREEN1_PRESENTATION, trainingShowLogos: true }}
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(6);
    expect(screen.getAllByTestId("training-group-row")).toHaveLength(6);
    expect(screen.getAllByTestId("training-team-logo")).toHaveLength(6);
    expect(screen.getAllByText(/Junioren D-/)).toHaveLength(6);
    expect(screen.getAllByText(/KUNSTRASEN 3 B/)).toHaveLength(6);
    for (const row of screen.getAllByTestId("training-group-row")) {
      const primary = row.querySelector("[data-training-identity-primary]");
      expect(primary).toBeTruthy();
      expect(getComputedStyle(primary as Element).textOverflow).not.toBe("ellipsis");
    }
  });
});
