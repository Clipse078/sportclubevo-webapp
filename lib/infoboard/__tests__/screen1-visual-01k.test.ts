/**
 * INFOBOARD-SCREEN1-VISUAL-01K — global Kabine alignment + XL Standard defaults.
 */

import { describe, expect, it } from "vitest";
import { buildBoardConfig } from "@/lib/infoboard/board-config";
import {
  DEFAULT_INFOBOARD_LOGO_SIZE,
  DEFAULT_MATCH_FONT_SIZE,
  DEFAULT_SCREEN1_PRESENTATION,
  DEFAULT_TOURNAMENT_FONT_SIZE,
  DEFAULT_TRAINING_FONT_SIZE,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  resolveCardPresentation,
  resolveMatchCardPresentation,
  resolveTournamentCardPresentation,
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

function matchItem(): DisplayItem {
  return {
    kind: "event",
    temporal: "next",
    item: {
      temporal: "next",
      event: {
        id: "match-1",
        type: "MATCH",
        displayTitle: "FC A vs FC B",
        teamDisplayName: "FC A",
        opponentDisplayName: "FC B",
        opponentLogoUrl: null,
        matchPresentation: null,
        organizerDisplayName: null,
        competitionLabel: "Meisterschaft",
        startAt: "2026-08-27T18:00:00.000Z",
        endAt: "2026-08-27T19:45:00.000Z",
        meetingTime: null,
        status: "SCHEDULED",
        resultLabel: null,
        intermediateResultLabel: null,
        temporalBucket: "next",
        seasonKey: "2025-26",
        allocation: {
          pitchLabel: "KR 2",
          homeDressingRoomLabel: "Kabine E1",
          awayDressingRoomLabel: "Kabine E2",
          refereeDressingRoomLabel: null,
        },
      },
    },
  };
}

function tournamentItem(): DisplayItem {
  return {
    kind: "event",
    temporal: "next",
    item: {
      temporal: "next",
      event: {
        id: "tournament-1",
        type: "TOURNAMENT",
        displayTitle: "BRACK.CH PLAYMORE TURNIER",
        teamDisplayName: null,
        opponentDisplayName: null,
        opponentLogoUrl: null,
        matchPresentation: null,
        organizerDisplayName: "BRACK.CH",
        competitionLabel: "Turnier",
        startAt: "2026-09-12T10:00:00.000Z",
        endAt: null,
        meetingTime: null,
        status: "SCHEDULED",
        resultLabel: null,
        intermediateResultLabel: null,
        temporalBucket: "next",
        seasonKey: "2026-27",
        allocation: {
          pitchLabel: "KR 2",
          homeDressingRoomLabel: null,
          awayDressingRoomLabel: null,
          refereeDressingRoomLabel: null,
        },
      },
    },
  };
}

describe("INFOBOARD-SCREEN1-VISUAL-01K — Standard resolves to XLARGE", () => {
  it("team/event Standard (null override) resolves to XLARGE", () => {
    const resolved = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      teamFontSize: null,
    });
    expect(resolved.teamFontSize).toBe("XLARGE");
  });

  it("kabine Standard (null override) resolves to XLARGE", () => {
    const resolved = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      kabineFontSize: null,
    });
    expect(resolved.kabineFontSize).toBe("XLARGE");
  });

  it("platz Standard (null override) resolves to XLARGE", () => {
    const resolved = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      platzFontSize: null,
    });
    expect(resolved.platzFontSize).toBe("XLARGE");
  });

  it("logo Standard (null override) resolves to XLARGE via global logo default", () => {
    const resolved = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      logoSize: null,
    });
    expect(resolved.logoSize).toBe(DEFAULT_INFOBOARD_LOGO_SIZE);
    expect(resolved.logoSize).toBe("XLARGE");
  });

  it("kabine/platz stay XLARGE when board team font is explicitly SMALL", () => {
    const global = {
      ...DEFAULT_SCREEN1_PRESENTATION,
      matchFontSize: "SMALL" as const,
    };
    const resolved = resolveMatchCardPresentation(global, undefined);
    expect(resolved.teamFontSize).toBe("SMALL");
    expect(resolved.kabineFontSize).toBe(DEFAULT_MATCH_FONT_SIZE);
    expect(resolved.platzFontSize).toBe(DEFAULT_MATCH_FONT_SIZE);
    expect(resolved.kabineFontSize).toBe("XLARGE");
    expect(resolved.platzFontSize).toBe("XLARGE");
  });

  it("explicit S/M/L/XL overrides remain functional", () => {
    const resolved = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      teamFontSize: "SMALL",
      kabineFontSize: "MEDIUM",
      platzFontSize: "LARGE",
      logoSize: "SMALL",
    });
    expect(resolved.teamFontSize).toBe("SMALL");
    expect(resolved.kabineFontSize).toBe("MEDIUM");
    expect(resolved.platzFontSize).toBe("LARGE");
    expect(resolved.logoSize).toBe("SMALL");
  });

  it("reset-to-Standard restores XLARGE for kabine and platz", () => {
    const key = trainingCohortKey("2026-08-27T18:45:00.000Z");
    const studio: Screen1StudioConfig = {
      cardOverrides: {
        [key]: {
          kabineFontSize: "SMALL",
          platzFontSize: "SMALL",
        },
      },
    };
    const withOverride = resolveCardPresentation(
      trainingItem("2026-08-27T18:45:00.000Z"),
      DEFAULT_SCREEN1_PRESENTATION,
      studio,
    );
    expect(withOverride.kind).toBe("training");
    if (withOverride.kind === "training") {
      expect(withOverride.presentation.kabineFontSize).toBe("SMALL");
      expect(withOverride.presentation.platzFontSize).toBe("SMALL");
    }

    const reset = resolveTrainingCardPresentation(DEFAULT_SCREEN1_PRESENTATION, {
      kabineFontSize: null,
      platzFontSize: null,
    });
    expect(reset.kabineFontSize).toBe("XLARGE");
    expect(reset.platzFontSize).toBe("XLARGE");
  });

  it("unconfigured board presentation resolves all categories to XLARGE", () => {
    const config = buildBoardConfig(board());
    expect(config.presentation.trainingFontSize).toBe(DEFAULT_TRAINING_FONT_SIZE);
    expect(config.presentation.matchFontSize).toBe(DEFAULT_MATCH_FONT_SIZE);
    expect(config.presentation.tournamentFontSize).toBe(DEFAULT_TOURNAMENT_FONT_SIZE);
    expect(config.presentation.trainingLogoSize).toBe("XLARGE");
    expect(config.presentation.matchLogoSize).toBe("XLARGE");
    expect(config.presentation.tournamentLogoSize).toBe("XLARGE");
  });

  it("match and tournament card resolvers inherit XLARGE kabine/platz defaults", () => {
    const match = resolveMatchCardPresentation(DEFAULT_SCREEN1_PRESENTATION, undefined);
    const tournament = resolveTournamentCardPresentation(DEFAULT_SCREEN1_PRESENTATION, undefined);
    expect(match.kabineFontSize).toBe("XLARGE");
    expect(match.platzFontSize).toBe("XLARGE");
    expect(tournament.kabineFontSize).toBe("XLARGE");
    expect(tournament.platzFontSize).toBe("XLARGE");
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01K — presentation resolution per event type", () => {
  it("resolveCardPresentation for training/match/tournament uses XLARGE kabine/platz by default", () => {
    for (const item of [trainingItem("2026-08-27T18:45:00.000Z"), matchItem(), tournamentItem()]) {
      const resolved = resolveCardPresentation(
        item,
        DEFAULT_SCREEN1_PRESENTATION,
        EMPTY_SCREEN1_STUDIO_CONFIG,
      );
      if (resolved.kind === "training") {
        expect(resolved.presentation.kabineFontSize).toBe("XLARGE");
        expect(resolved.presentation.platzFontSize).toBe("XLARGE");
      } else if (resolved.kind === "match" || resolved.kind === "tournament") {
        expect(resolved.presentation.kabineFontSize).toBe("XLARGE");
        expect(resolved.presentation.platzFontSize).toBe("XLARGE");
      }
    }
  });
});
