/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R10R1 — activity TIME surfaces + training composition contract.
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
  TRAINING_ROW_COUNT_ATTR,
  TRAINING_ROW_COUNT_VAR,
} from "@/lib/infoboard/training-participant-density";
import {
  VENUE_LIGHT_TIME_SURFACE_VARS,
  VENUE_TIME_SURFACE_SEMANTIC_ALIASES,
} from "@/lib/infoboard/venue-display-grid";
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

function makeEvent(
  overrides: Partial<InfoboardScreen1Event> & { type: InfoboardScreen1Event["type"] },
): InfoboardScreen1Event {
  return {
    id: "e1",
    displayTitle: "Event",
    teamDisplayName: "FC Allschwil Junioren F2",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-09-12T15:00:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR1",
      homeDressingRoomLabel: "E1",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function trainingCohort(count: number): InfoboardScreen1Feed {
  const items = Array.from({ length: count }, (_, index) =>
    makeEvent({
      id: `tr-${index}`,
      type: "TRAINING",
      teamDisplayName: `FC Allschwil Junioren D-${index + 7} D${index + 1}`,
      allocation: {
        pitchLabel: `KR ${index + 1}`,
        homeDressingRoomLabel: `E${index + 3}`,
        awayDressingRoomLabel: null,
        refereeDressingRoomLabel: null,
      },
    }),
  );
  return makeFeed(items);
}

describe("R10R1 SURFACE SEMANTICS", () => {
  it("maps canonical activity types to semantic TIME surface aliases", () => {
    expect(CSS).toMatch(/--ib-time-surface-match:\s*var\(--ib-zone-surface-time-match\)/);
    expect(CSS).toMatch(
      /--ib-time-surface-training:\s*var\(--ib-zone-surface-time-training\)/,
    );
    expect(CSS).toMatch(
      /--ib-time-surface-tournament:\s*var\(--ib-zone-surface-time-tournament\)/,
    );
    expect(CSS).toMatch(/--ib-zone-surface-time-match:\s*#FFF3F2/);
    expect(CSS).toMatch(/--ib-zone-surface-time-training:\s*#F1F6FD/);
    expect(CSS).toMatch(/--ib-zone-surface-time-tournament:\s*#FFF6EA/);
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    for (const token of Object.values(VENUE_TIME_SURFACE_SEMANTIC_ALIASES)) {
      expect(CSS).toMatch(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
  });

  it("applies type-specific TIME backgrounds under LIGHT (not page position)", () => {
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="MATCH"\][\s\S]*--ib-time-surface-match/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="TRAINING"\][\s\S]*--ib-time-surface-training/,
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-type="TOURNAMENT"\][\s\S]*--ib-time-surface-tournament/,
    );
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });
});

describe("R10R1 TRAINING SINGLE", () => {
  it("renders one TRAINING context with crest, club, and team in spacious layout", () => {
    render(
      <InfoboardScreen1
        feed={trainingCohort(1)}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    expect(within(card).getAllByText("TRAINING")).toHaveLength(1);
    expect(within(card).getByTestId("training-team-logo-placeholder")).toBeTruthy();
    expect(within(card).getByText(/Junioren D-7 D1/i)).toBeTruthy();
    expect(within(card).queryByText(/^FC ALLSCHWIL$/i)).toBeNull();
    expect(within(card).getByText("KABINE")).toBeTruthy();
    expect(within(card).getByText("PLATZ")).toBeTruthy();
    expect(trainingGroupDensityTier(1)).toBe("spacious");
    expect(card.getAttribute("data-training-count")).toBe("1");
  });
});

describe("R10R1 TRAINING MULTI", () => {
  const densityCases = [
    { count: 2, tier: "spacious" },
    { count: 4, tier: "standard" },
    { count: 6, tier: "compact" },
    { count: 7, tier: "dense" },
  ] as const;

  for (const { count, tier } of densityCases) {
    it(`cohort of ${count} uses ${tier} density and canonical identity rows`, () => {
      cleanup();
      render(
        <InfoboardScreen1
          feed={trainingCohort(count)}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme="LIGHT"
        />,
      );
      const card = screen.getByTestId("event-row");
      expect(within(card).getAllByText("TRAINING")).toHaveLength(1);
      expect(trainingGroupDensityTier(count)).toBe(tier);
      expect(resolveTrainingParticipantDensity(count)).toBe(tier);
      expect(screen.getAllByTestId("training-group-row")).toHaveLength(count);
      expect(screen.getAllByTestId("training-matrix-row")).toHaveLength(count);
      expect(card.getAttribute(TRAINING_ROW_COUNT_ATTR)).toBe(String(count));
      for (let index = 0; index < count; index += 1) {
        const row = screen.getAllByTestId("training-matrix-row")[index]!;
        expect(row.getAttribute("data-training-row-index")).toBe(String(index));
        expect(within(row).getByText(/Junioren D-/i)).toBeTruthy();
      }
    });
  }
});

describe("R10R1 HEIGHT UTILISATION CONTRACT", () => {
  it("uses shared N-row track geometry driven by row count (not independent lists)", () => {
    expect(CSS).toMatch(
      new RegExp(
        `\\.trainingRowMatrix[\\s\\S]*grid-template-rows:\\s*repeat\\([\\s\\S]*${TRAINING_ROW_COUNT_VAR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      ),
    );
    expect(CSS).toMatch(/\.trainingMatrixRow[\s\S]*grid-template-columns:\s*subgrid/);
    expect(CSS).not.toMatch(/\.trainingKabineRows|\.trainingPlatzRows/);
  });

  it("exposes row count on rendered training cards", () => {
    render(
      <InfoboardScreen1
        feed={trainingCohort(6)}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row") as HTMLElement;
    expect(card.getAttribute(TRAINING_ROW_COUNT_ATTR)).toBe("6");
    expect(card.style.getPropertyValue(TRAINING_ROW_COUNT_VAR)).toBe("6");
  });
});

describe("R10R1 MATCH INVARIANT (TIME only)", () => {
  it("match card keeps data-type=MATCH for TIME surface selection", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([
          makeEvent({
            type: "MATCH",
            opponentDisplayName: "FC Rival",
            teamDisplayName: "FC Allschwil",
          }),
        ])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getByTestId("event-row").getAttribute("data-type")).toBe("MATCH");
  });
});
