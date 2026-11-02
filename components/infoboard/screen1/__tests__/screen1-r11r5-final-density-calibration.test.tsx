/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R11R5 — training crest density + tournament Kabine secondary typography.
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
  MATCH_KABINE_ROLE_FONT_SIZE_VAR,
  MATCH_KABINE_ROLE_FONT_WEIGHT,
  TOURNAMENT_KABINE_USES_SECONDARY_ASSOCIATION_TIER,
  VENUE_KABINE_SECONDARY_ASSOCIATION_COLOR_VAR,
  VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_SIZE_VAR,
  VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_WEIGHT,
} from "@/lib/infoboard/match-kabine-role-typography";
import { DEFAULT_SCREEN1_PRESENTATION } from "@/lib/infoboard/screen1-logo-settings";
import {
  TRAINING_CANONICAL_IDENTITY_CREST_CLAMP,
  TRAINING_CANONICAL_TEAM_NAME_CLAMP,
  TRAINING_DENSITY_CHANGES_IDENTITY_SCALE,
  TRAINING_IDENTITY_CREST_SIZE_VAR,
  TRAINING_PARTICIPANT_LOGO_CLAMP,
  TRAINING_PARTICIPANT_TEAM_CLAMP,
  TRAINING_R11R4_IDENTITY_CREST_BASELINE_CLAMP,
  TRAINING_TEAM_NAME_SIZE_VAR,
} from "@/lib/infoboard/training-participant-density";
import {
  VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS,
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
} from "@/lib/infoboard/venue-display-grid";
import {
  PREVIEW_FIXTURE_TOURNAMENT_4TEAM,
  PREVIEW_TOURNAMENT_4TEAM_EXTENSIONS,
} from "@/components/infoboard/screen1/screen1-preview-fixture";
import {
  parseClampMinRem,
  parseClampMaxRem,
} from "@/lib/infoboard/venue-distance-typography";
import {
  resolveVenuePresentationDensity,
  scaleVenuePresentationClamp,
} from "@/lib/infoboard/venue-presentation-density";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

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

describe("R11R5 TRAINING_CREST", () => {
  it("TRAINING_CREST_DENSITY_DEPENDENT = false", () => {
    const crestClamps = new Set(Object.values(TRAINING_PARTICIPANT_LOGO_CLAMP));
    expect(crestClamps.size).toBe(1);
    expect(TRAINING_DENSITY_CHANGES_IDENTITY_SCALE).toBe(false);

    const crestValues = new Set<string>();
    for (let count = 1; count <= 6; count += 1) {
      crestValues.add(trainingCardStyle(count).crest);
    }
    expect(crestValues.size).toBe(1);
  });

  it("TRAINING_CREST_MAX_REM < R11R4_CREST_MAX_REM with min ≈ 2.4rem", () => {
    const r11r4Max = parseClampMaxRem(TRAINING_R11R4_IDENTITY_CREST_BASELINE_CLAMP);
    const r11r5Max = parseClampMaxRem(TRAINING_CANONICAL_IDENTITY_CREST_CLAMP);
    expect(r11r5Max).toBeLessThan(r11r4Max);
    expect(parseClampMinRem(TRAINING_CANONICAL_IDENTITY_CREST_CLAMP)).toBeCloseTo(2.4, 1);
  });

  it("TRAINING_TEAM_NAME_DENSITY_DEPENDENT = false and size locked to R11R4", () => {
    const teamClamps = new Set(Object.values(TRAINING_PARTICIPANT_TEAM_CLAMP));
    expect(teamClamps.size).toBe(1);
    expect([...teamClamps][0]).toBe(TRAINING_CANONICAL_TEAM_NAME_CLAMP);

    const expectedTeam = scaleVenuePresentationClamp(
      TRAINING_CANONICAL_TEAM_NAME_CLAMP,
      TRAINING_PAGE_VENUE_DENSITY,
    );
    for (let count = 1; count <= 6; count += 1) {
      expect(trainingCardStyle(count).team).toBe(expectedTeam);
    }
  });
});

describe("R11R5 TOURNAMENT_KABINE_SECONDARY_TIER", () => {
  it("TOURNAMENT_KABINE_ASSOCIATION_USES_SECONDARY_TIER = true", () => {
    expect(TOURNAMENT_KABINE_USES_SECONDARY_ASSOCIATION_TIER).toBe(true);
    expect(VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_SIZE_VAR).toBe(
      MATCH_KABINE_ROLE_FONT_SIZE_VAR,
    );
    expect(VENUE_KABINE_SECONDARY_ASSOCIATION_FONT_WEIGHT).toBe(MATCH_KABINE_ROLE_FONT_WEIGHT);
    expect(VENUE_KABINE_SECONDARY_ASSOCIATION_COLOR_VAR).toBe(MATCH_KABINE_ROLE_COLOR_VAR);
  });

  it("TOURNAMENT_KABINE_SECONDARY_TIER = MATCH_KABINE_ROLE_SECONDARY_TIER in CSS", () => {
    const roleVar = MATCH_KABINE_ROLE_FONT_SIZE_VAR.replace("--", "\\-\\-");
    expect(CSS).toMatch(
      new RegExp(
        `\\.participantTeamName[\\s\\S]*font-size:\\s*var\\(${roleVar}\\)`,
      ),
    );
    expect(CSS).toMatch(
      new RegExp(
        `\\.eventCard\\[data-type="TOURNAMENT"\\] \\.participantTeamName[\\s\\S]*font-size:\\s*var\\(${roleVar}\\)`,
      ),
    );
    expect(CSS).toMatch(
      new RegExp(
        `\\.matchAllocRole[\\s\\S]*font-size:\\s*var\\(${roleVar}\\)`,
      ),
    );
    expect(CSS).toMatch(
      new RegExp(
        `\\.participantTeamName[\\s\\S]*font-weight:\\s*${MATCH_KABINE_ROLE_FONT_WEIGHT}`,
      ),
    );
    expect(CSS).toMatch(
      new RegExp(
        `\\.participantTeamName[\\s\\S]*color:\\s*var\\(${MATCH_KABINE_ROLE_COLOR_VAR.replace("--", "\\-\\-")}`,
      ),
    );
  });

  it("renders tournament Kabine team association without replacing identity with HEIM/GAST", () => {
    render(
      <InfoboardScreen1
        feed={PREVIEW_FIXTURE_TOURNAMENT_4TEAM}
        eventPresentation={PREVIEW_TOURNAMENT_4TEAM_EXTENSIONS}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const kabine = screen.getByTestId("participant-allocation-block");
    expect(within(kabine).queryByText(/^Heim$/i)).toBeNull();
    expect(within(kabine).queryByText(/^Gast$/i)).toBeNull();
    expect(kabine.textContent).toMatch(/FC ALLSCHWIL|JUNIOREN/i);
    expect(styles.participantTeamName).toBeTruthy();
    expect(styles.matchAllocRole).toBeTruthy();
  });
});

describe("R11R5 LOCKED_INVARIANTS", () => {
  it("GRID_UNCHANGED = 15 / 43 / 22 / 20", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
    expect(VENUE_ACTIVITY_GRID_TEMPLATE_COLUMNS).toContain("var(--ib-zone-time)");
    expect(CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(CSS).toMatch(/--ib-zone-event:\s*43%/);
    expect(CSS).toMatch(/--ib-zone-room:\s*22%/);
    expect(CSS).toMatch(/--ib-zone-pitch:\s*20%/);
  });

  it("MATCH_CREST_SCALE_UNCHANGED and tournament participant CSS tokens untouched", () => {
    expect(CSS).toMatch(/\.matchClubLogo[\s\S]*width:\s*var\(--ib-match-logo-size\)/);
    expect(CSS).toMatch(
      /--ib-fs-tournament-participant|\.tournamentParticipantName/,
    );
  });

  it("CARD_HEIGHT_MODEL_UNCHANGED uses demand-driven flex growth", () => {
    expect(CSS).toMatch(/--ib-card-demand/);
    expect(CSS).toMatch(/flex:\s*var\(--ib-card-demand/);
  });
});
