/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R19 — Platz pill single-line contract (Screen 1).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES } from "@/lib/infoboard/venue-display-grid";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function cssBlock(selector: string): string {
  const start = CSS.indexOf(selector);
  expect(start, `Missing CSS selector ${selector}`).toBeGreaterThanOrEqual(0);
  return CSS.slice(start, CSS.indexOf("}", start));
}

function makeFeed(events: InfoboardScreen1Event[]): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-09-12T08:00:00.000Z",
    tenant: {
      id: "tenant-fca",
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

function pitchAllocation(label: string): InfoboardScreen1Event["allocation"] {
  return {
    pitchLabel: label,
    homeDressingRoomLabel: "E1",
    awayDressingRoomLabel: null,
    refereeDressingRoomLabel: null,
  };
}

function makeMatch(pitchLabel: string): InfoboardScreen1Event {
  return {
    id: "m-r19",
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
      ...pitchAllocation(pitchLabel),
      awayDressingRoomLabel: "E2",
    },
  };
}

function makeTournament(pitchLabel: string): InfoboardScreen1Event {
  return {
    id: "t-r19",
    type: "TOURNAMENT",
    displayTitle: "F-BLITZTURNIER",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "FC ALLSCHWIL",
    competitionLabel: null,
    startAt: "2026-09-12T11:00:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: pitchAllocation(pitchLabel),
  };
}

function makeTraining(id: string, pitchLabel: string): InfoboardScreen1Event {
  return {
    id,
    type: "TRAINING",
    displayTitle: "Training",
    teamDisplayName: `FC Allschwil ${id}`,
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
    allocation: pitchAllocation(pitchLabel),
  };
}

afterEach(() => {
  cleanup();
});

describe("R19 Platz pill CSS contract", () => {
  it("shares nowrap single-line rules across destPitchValue and trainingGroupPitchValue", () => {
    const shared = cssBlock(".destPitchValue,\n.trainingGroupPitchValue {");
    expect(shared).toMatch(/white-space:\s*nowrap/);
    expect(shared).toMatch(/width:\s*100%/);
    expect(shared).toMatch(/overflow:\s*visible/);
    expect(shared).toMatch(/text-overflow:\s*clip/);
    expect(shared).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  it("does not hide overflow on cardPitchZone pitch values", () => {
    const cardPitch = cssBlock(".cardPitchZone .destPitchValue {");
    expect(cardPitch).toMatch(/white-space:\s*nowrap/);
    expect(cardPitch).toMatch(/overflow:\s*visible/);
    expect(cardPitch).not.toMatch(/overflow:\s*hidden/);
  });

  it("uses container-query typography fallback for long labels", () => {
    expect(CSS).toMatch(/container-name:\s*ib-platz-slot/);
    expect(CSS).toMatch(/clamp\(0\.875rem,\s*11\.5cqi,\s*2\.75rem\)/);
  });

  it("keeps LIGHT and DARK pill surfaces on the same selectors", () => {
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.destPitchValue[\s\S]*background:\s*#E8F3ED/,
    );
    expect(CSS).toMatch(
      /\.destPitchValue,\s*\n\.trainingGroupPitchValue[\s\S]*background:\s*rgba\(26,\s*122,\s*74/,
    );
  });

  it("preserves venue grid 15/43/22/20 allocation", () => {
    const { time, activity, kabine, platz } = VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES;
    expect(time).toBe(15);
    expect(activity).toBe(43);
    expect(kabine).toBe(22);
    expect(platz).toBe(20);
    expect(time + activity + kabine + platz).toBe(100);
  });
});

describe("R19 canonical pitch labels render on one line", () => {
  it("MATCH — KUNSTRASEN 3 A", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeMatch("KUNSTRASEN 3 A")])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="DARK"
      />,
    );
    const pill = within(screen.getByTestId("event-row")).getByTestId("pitch-value");
    expect(pill.textContent).toBe("KUNSTRASEN 3 A");
    expect(pill.className).toMatch(/destPitchValue/);
  });

  it("TOURNAMENT — KUNSTRASEN 2 A (LIGHT)", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeTournament("KUNSTRASEN 2 A")])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const pill = within(screen.getByTestId("event-row")).getByTestId("pitch-value");
    expect(pill.textContent).toBe("KUNSTRASEN 2 A");
    expect(pill.className).toMatch(/destPitchValue/);
  });

  it("TRAINING matrix — KUNSTRASEN 3 B and dense cohort", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([
          makeTraining("tr-0", "KUNSTRASEN 3 B"),
          makeTraining("tr-1", "KUNSTRASEN 2 B"),
          makeTraining("tr-2", "KUNSTRASEN 2 A"),
          makeTraining("tr-3", "KUNSTRASEN 3 A"),
        ])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="DARK"
      />,
    );
    const pills = screen.getAllByTestId("pitch-value");
    expect(pills.map((p) => p.textContent)).toEqual([
      "KUNSTRASEN 3 B",
      "KUNSTRASEN 2 B",
      "KUNSTRASEN 2 A",
      "KUNSTRASEN 3 A",
    ]);
    pills.forEach((pill) => expect(pill.className).toMatch(/trainingGroupPitchValue/));
  });

  it("long KR designation remains full text without ellipsis", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeTraining("tr-long", "KR 3 – FELD A")])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const pill = screen.getByTestId("pitch-value");
    expect(pill.textContent).toBe("KR 3 – FELD A");
    expect(pill.className).toMatch(/trainingGroupPitchValue/);
  });
});
