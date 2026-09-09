/**
 * INFOBOARD-SCREEN1-VISUAL-01H — XL defaults and override resolution.
 */

import { describe, expect, it } from "vitest";
import { buildBoardConfig } from "@/lib/infoboard/board-config";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  resolveScreen1PageDemandMax,
  SCREEN1_PAGE_DEMAND_MAX,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  resolveCardPresentation,
  resolveMatchCardPresentation,
  resolveTrainingCardPresentation,
} from "@/lib/infoboard/screen1-card-presentation";
import { trainingCohortKey } from "@/lib/infoboard/screen1-studio-keys";
import {
  EMPTY_SCREEN1_STUDIO_CONFIG,
  type Screen1StudioConfig,
} from "@/lib/infoboard/screen1-studio-types";
import type { InboardRow } from "@/lib/infoboard/types";
import type { DisplayItem } from "@/components/infoboard/screen1/InfoboardScreen1";

function board(overrides: Partial<InboardRow> = {}): InboardRow {
  return {
    id: "board-1",
    tenantId: "tenant-1",
    name: "Tagesübersicht Eingang",
    slug: "screen-1",
    status: "ACTIVE",
    templateType: "TAGESUEBERSICHT",
    displayTheme: null,
    headerSubtitleEnabled: true,
    headerSubtitleText: null,
    headerShowTime: true,
    headerShowDate: true,
    headerShowWeather: false,
    announcementEnabled: false,
    announcementText: null,
    announcementBgColor: null,
    announcementTextColor: null,
    layoutJson: null,
    anlageplanBackgroundUrl: null,
    anlageplanJson: null,
    sortOrder: 0,
    screen1TrainingShowLogos: true,
    screen1TrainingLogoSize: null,
    screen1MatchShowLogos: true,
    screen1MatchLogoSize: null,
    screen1TournamentShowLogos: true,
    screen1TournamentLogoSize: null,
    screen1TrainingFontSize: null,
    screen1MatchFontSize: null,
    screen1TournamentFontSize: null,
    screen1StudioJson: null,
    createdAt: new Date("2026-08-24T00:00:00.000Z"),
    updatedAt: new Date("2026-08-24T00:00:00.000Z"),
    ...overrides,
  } as InboardRow;
}

function trainingItem(startAt: string): DisplayItem {
  return {
    kind: "training-group",
    temporal: "next",
    items: [
      {
        temporal: "next",
        event: {
          id: "training-1",
          type: "TRAINING",
          displayTitle: "Team A",
          teamDisplayName: "Team A",
          opponentDisplayName: null,
          opponentLogoUrl: null,
          matchPresentation: null,
          organizerDisplayName: null,
          competitionLabel: null,
          startAt,
          endAt: "2026-08-27T16:45:00.000Z",
          meetingTime: null,
          status: "SCHEDULED",
          resultLabel: null,
          intermediateResultLabel: null,
          temporalBucket: "next",
          seasonKey: "2025-26",
          allocation: {
            pitchLabel: "KR2",
            homeDressingRoomLabel: "Kabine E1",
            awayDressingRoomLabel: null,
            refereeDressingRoomLabel: null,
          },
        },
      },
    ],
  };
}

describe("INFOBOARD-SCREEN1-VISUAL-01H — XL defaults", () => {
  it("DEFAULT_SCREEN1_PRESENTATION resolves team, kabine, platz, and logo to XLARGE", () => {
    expect(DEFAULT_SCREEN1_PRESENTATION.trainingFontSize).toBe("XLARGE");
    expect(DEFAULT_SCREEN1_PRESENTATION.matchFontSize).toBe("XLARGE");
    expect(DEFAULT_SCREEN1_PRESENTATION.tournamentFontSize).toBe("XLARGE");
    expect(DEFAULT_SCREEN1_PRESENTATION.trainingLogoSize).toBe("XLARGE");
    expect(DEFAULT_SCREEN1_PRESENTATION.matchLogoSize).toBe("XLARGE");
    expect(DEFAULT_SCREEN1_PRESENTATION.tournamentLogoSize).toBe("XLARGE");
  });

  it("buildBoardConfig uses XLARGE when persisted board sizes are absent", () => {
    const config = buildBoardConfig(board());
    expect(config.presentation.trainingFontSize).toBe("XLARGE");
    expect(config.presentation.matchFontSize).toBe("XLARGE");
    expect(config.presentation.tournamentFontSize).toBe("XLARGE");
    expect(config.presentation.trainingLogoSize).toBe("XLARGE");
    expect(config.presentation.matchLogoSize).toBe("XLARGE");
    expect(config.presentation.tournamentLogoSize).toBe("XLARGE");
  });

  it("resolveCardPresentation inherits XLARGE for team, kabine, platz, and logo", () => {
    const resolved = resolveCardPresentation(
      trainingItem("2026-08-27T18:45:00.000Z"),
      DEFAULT_SCREEN1_PRESENTATION,
      EMPTY_SCREEN1_STUDIO_CONFIG,
    );
    expect(resolved.kind).toBe("training");
    if (resolved.kind === "training") {
      expect(resolved.presentation.teamFontSize).toBe("XLARGE");
      expect(resolved.presentation.kabineFontSize).toBe("XLARGE");
      expect(resolved.presentation.platzFontSize).toBe("XLARGE");
      expect(resolved.presentation.logoSize).toBe("XLARGE");
    }
  });

  it("Standard (null studio override) resolves to XLARGE via global defaults", () => {
    const resolved = resolveTrainingCardPresentation(
      DEFAULT_SCREEN1_PRESENTATION,
      { teamFontSize: null, kabineFontSize: null, platzFontSize: null, logoSize: null },
    );
    expect(resolved.teamFontSize).toBe("XLARGE");
    expect(resolved.kabineFontSize).toBe("XLARGE");
    expect(resolved.platzFontSize).toBe("XLARGE");
    expect(resolved.logoSize).toBe("XLARGE");
  });

  it("honors explicit non-XL saved overrides", () => {
    const key = trainingCohortKey("2026-08-27T18:45:00.000Z");
    const studio: Screen1StudioConfig = {
      cardOverrides: {
        [key]: {
          teamFontSize: "SMALL",
          kabineFontSize: "MEDIUM",
          platzFontSize: "LARGE",
          logoSize: "SMALL",
        },
      },
    };
    const resolved = resolveCardPresentation(
      trainingItem("2026-08-27T18:45:00.000Z"),
      DEFAULT_SCREEN1_PRESENTATION,
      studio,
    );
    expect(resolved.kind).toBe("training");
    if (resolved.kind === "training") {
      expect(resolved.presentation.teamFontSize).toBe("SMALL");
      expect(resolved.presentation.kabineFontSize).toBe("MEDIUM");
      expect(resolved.presentation.platzFontSize).toBe("LARGE");
      expect(resolved.presentation.logoSize).toBe("SMALL");
    }
  });

  it("honors explicit persisted board-level MEDIUM overrides", () => {
    const config = buildBoardConfig(
      board({
        screen1TrainingFontSize: "MEDIUM",
        screen1MatchFontSize: "SMALL",
        screen1TournamentFontSize: "LARGE",
        screen1TrainingLogoSize: "MEDIUM",
      }),
    );
    expect(config.presentation.trainingFontSize).toBe("MEDIUM");
    expect(config.presentation.matchFontSize).toBe("SMALL");
    expect(config.presentation.tournamentFontSize).toBe("LARGE");
    expect(config.presentation.trainingLogoSize).toBe("MEDIUM");
  });

  it("lowers default page capacity relative to the unscaled ceiling", () => {
    expect(resolveScreen1PageDemandMax(DEFAULT_SCREEN1_PRESENTATION)).toBeLessThan(
      SCREEN1_PAGE_DEMAND_MAX,
    );
  });

  it("resolveMatchCardPresentation inherits match XL defaults", () => {
    const resolved = resolveMatchCardPresentation(DEFAULT_SCREEN1_PRESENTATION, undefined);
    expect(resolved.teamFontSize).toBe("XLARGE");
    expect(resolved.kabineFontSize).toBe("XLARGE");
    expect(resolved.platzFontSize).toBe("XLARGE");
    expect(resolved.logoSize).toBe("XLARGE");
  });
});
