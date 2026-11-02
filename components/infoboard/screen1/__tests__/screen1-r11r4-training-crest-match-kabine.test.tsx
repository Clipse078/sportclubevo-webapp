/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11R4 — training crest scale + match KABINE HEIM/GAST readability.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import styles from "@/components/infoboard/screen1/InfoboardScreen1.module.css";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  MATCH_KABINE_ROLE_COLOR_VAR,
  MATCH_KABINE_ROLE_FONT_SIZE_DARK,
  MATCH_KABINE_ROLE_FONT_SIZE_LIGHT,
  MATCH_KABINE_ROLE_FONT_SIZE_R11R3_DARK,
  MATCH_KABINE_ROLE_FONT_SIZE_SPACIOUS_SINGLE,
  MATCH_KABINE_ROLE_FONT_SIZE_VAR,
  MATCH_KABINE_ROLE_FONT_WEIGHT,
  MATCH_KABINE_ROLE_USES_TEAM_NAMES,
} from "@/lib/infoboard/match-kabine-role-typography";
import { DEFAULT_SCREEN1_PRESENTATION } from "@/lib/infoboard/screen1-logo-settings";
import {
  TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
  TRAINING_CANONICAL_TEAM_NAME_CLAMP,
  TRAINING_IDENTITY_CREST_SIZE_VAR,
  TRAINING_PARTICIPANT_LOGO_CLAMP,
  TRAINING_PARTICIPANT_TEAM_CLAMP,
  TRAINING_R11R3_IDENTITY_CREST_BASELINE_CLAMP,
  TRAINING_R11R4_IDENTITY_CREST_BASELINE_CLAMP,
  TRAINING_TEAM_NAME_SIZE_VAR,
} from "@/lib/infoboard/training-participant-density";
import {
  resolveVenuePresentationDensity,
  scaleVenuePresentationClamp,
} from "@/lib/infoboard/venue-presentation-density";
import { parseClampMinRem } from "@/lib/infoboard/venue-distance-typography";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

/** One training-group card on the page → spacious venue presentation density. */
const TRAINING_PAGE_VENUE_DENSITY = resolveVenuePresentationDensity(1);

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
      pitchLabel: "KUNSTRASEN 3 B",
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

function trainingCardStyle(participantCount: number): { crest: string; team: string } {
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

describe("R11R4 TRAINING_CREST_SIZE_INVARIANT", () => {
  it("uses one canonical crest token for participant counts 1–6", () => {
    const crestValues = new Set<string>();
    for (let count = 1; count <= 6; count += 1) {
      const { crest } = trainingCardStyle(count);
      expect(crest.length).toBeGreaterThan(0);
      crestValues.add(crest);
    }
    expect(crestValues.size).toBe(1);
    expect([...crestValues][0]).toBe(
      scaleVenuePresentationClamp(
        TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
        TRAINING_PAGE_VENUE_DENSITY,
      ),
    );
  });

  it("has no density-specific crest scale in participant density map", () => {
    const crestClamps = new Set(Object.values(TRAINING_PARTICIPANT_LOGO_CLAMP));
    expect(crestClamps.size).toBe(1);
    expect([...crestClamps][0]).toBe(TRAINING_CANONICAL_IDENTITY_CREST_CLAMP);
  });

  it("R11R4 crest is smaller than R11R3 baseline (~20–25%)", () => {
    const before = parseClampMinRem(TRAINING_R11R3_IDENTITY_CREST_BASELINE_CLAMP);
    const r11r4 = parseClampMinRem(TRAINING_R11R4_IDENTITY_CREST_BASELINE_CLAMP);
    expect(r11r4).toBeLessThan(before);
    const reduction = (before - r11r4) / before;
    expect(reduction).toBeGreaterThanOrEqual(0.2);
    expect(reduction).toBeLessThanOrEqual(0.28);

    const { crest } = trainingCardStyle(3);
    const scaledR11R3 = scaleVenuePresentationClamp(
      TRAINING_R11R3_IDENTITY_CREST_BASELINE_CLAMP,
      TRAINING_PAGE_VENUE_DENSITY,
    );
    expect(parseClampMinRem(crest)).toBeLessThan(parseClampMinRem(scaledR11R3));
    const scaledR11R4 = scaleVenuePresentationClamp(
      TRAINING_R11R4_IDENTITY_CREST_BASELINE_CLAMP,
      TRAINING_PAGE_VENUE_DENSITY,
    );
    expect(parseClampMinRem(crest)).toBeLessThan(parseClampMinRem(scaledR11R4));
  });
});

describe("R11R4 TRAINING_TEAM_NAME_LOCK", () => {
  it("keeps R11R3 canonical team-name size for all participant counts", () => {
    const expectedTeam = scaleVenuePresentationClamp(
      TRAINING_CANONICAL_TEAM_NAME_CLAMP,
      TRAINING_PAGE_VENUE_DENSITY,
    );
    for (let count = 1; count <= 6; count += 1) {
      const { team } = trainingCardStyle(count);
      expect(team).toBe(expectedTeam);
    }
  });

  it("does not vary team-name clamp across density tiers", () => {
    const teamClamps = new Set(Object.values(TRAINING_PARTICIPANT_TEAM_CLAMP));
    expect(teamClamps.size).toBe(1);
    expect([...teamClamps][0]).toBe(TRAINING_CANONICAL_TEAM_NAME_CLAMP);
  });
});

describe("R11R4 MATCH_KABINE_ROLE", () => {
  it("renders HEIM and GAST without duplicating match team names", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([matchEvent()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const kabine = screen.getByTestId("match-allocation");
    expect(within(kabine).getByText("Heim")).toBeTruthy();
    expect(within(kabine).getByText("Gast")).toBeTruthy();
    expect(within(kabine).getByText("04")).toBeTruthy();
    expect(within(kabine).getByText("E1")).toBeTruthy();
    expect(kabine.textContent).not.toContain("FC Allschwil 1. Mannschaft");
    expect(kabine.textContent).not.toContain("FC Nordstern");
    expect(MATCH_KABINE_ROLE_USES_TEAM_NAMES).toBe(false);
  });

  it("uses improved canonical role typography in CSS", () => {
    expect(CSS).toContain(`--ib-fs-match-role:       ${MATCH_KABINE_ROLE_FONT_SIZE_DARK}`);
    expect(CSS).toContain(`--ib-fs-match-role:       ${MATCH_KABINE_ROLE_FONT_SIZE_LIGHT}`);
    expect(CSS).toContain(MATCH_KABINE_ROLE_COLOR_VAR);
    expect(CSS).toMatch(
      new RegExp(
        `\\.matchAllocRole[\\s\\S]*font-weight:\\s*${MATCH_KABINE_ROLE_FONT_WEIGHT}`,
      ),
    );
    expect(CSS).toMatch(/\.matchAllocRole[\s\S]*color:\s*var\(--ib-match-kabine-role-color/);
    expect(CSS).toMatch(/\.matchAllocRow[\s\S]*align-items:\s*center/);
  });

  it("R11R4 role labels exceed R11R3 dark baseline (~35%+)", () => {
    const before = parseClampMinRem(MATCH_KABINE_ROLE_FONT_SIZE_R11R3_DARK);
    const after = parseClampMinRem(MATCH_KABINE_ROLE_FONT_SIZE_DARK);
    expect(after).toBeGreaterThan(before * 1.35);
  });

  it("room number remains primary via matchAllocRoom weight and role token var", () => {
    expect(CSS).toMatch(/\.matchAllocRoom[\s\S]*font-weight:\s*700/);
    expect(CSS).toMatch(
      new RegExp(
        `\\.matchAllocRole[\\s\\S]*font-size:\\s*var\\(${MATCH_KABINE_ROLE_FONT_SIZE_VAR.replace("--", "\\-\\-")}\\)`,
      ),
    );
    expect(parseClampMinRem(MATCH_KABINE_ROLE_FONT_SIZE_SPACIOUS_SINGLE)).toBeLessThan(
      parseClampMinRem("clamp(1.5625rem, 1.85vw, 1.875rem)"),
    );
  });

  it("exports role class for structural parity", () => {
    expect(styles.matchAllocRole).toBeTruthy();
    expect(styles.matchAllocRoom).toBeTruthy();
  });
});
