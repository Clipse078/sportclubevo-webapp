/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R16 — true full-cover ambient + foreground isolation (automated contract).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import {
  INFOBOARD_AMBIENT_ASSET_PATHS,
  resolveActivityAmbientSrc,
} from "@/lib/infoboard/screen1-ambient-assets";
import {
  KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY,
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT,
  VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX,
  VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX_CSS_VARS,
} from "@/lib/infoboard/screen1-ambient-depth";
import {
  VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES,
  VENUE_OPERATIONAL_AMBIENT_PRESENTATION,
} from "@/lib/infoboard/venue-display-grid";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import {
  buildWednesday20260826Feed,
  resolveWednesdayPreviewCurrentTimeIso,
} from "@/components/infoboard/screen1/wednesday-2026-08-26-fixture";

const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);
const AMBIENT_CSS = readFileSync(
  resolve(
    process.cwd(),
    "components/infoboard/venue-display/VenueAmbientLayer.module.css",
  ),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
  tenantPrimaryColor: "#0b4aa2",
  tenantSecondaryColor: "#c7332c",
};

function baseEvent(overrides: Partial<InfoboardScreen1Event>): InfoboardScreen1Event {
  return {
    id: "evt-1",
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "HOME",
    opponentDisplayName: "AWAY",
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: "Liga",
    startAt: "2026-11-01T14:00:00.000Z",
    endAt: "2026-11-01T15:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "current",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 1",
      homeDressingRoomLabel: "05",
      awayDressingRoomLabel: "06",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function renderSingle(event: InfoboardScreen1Event) {
  return render(
    <InfoboardScreen1
      feed={{
        generatedAt: "2026-11-01T08:00:00.000Z",
        tenant: {
          id: "t1",
          key: "fc-allschwil",
          name: "FC Allschwil",
          timezone: "Europe/Zurich",
        },
        displayDate: "2026-11-01",
        isStale: false,
        wochenplanVariantBadge: null,
        current: [event],
        next: [],
        later: [],
        isEmpty: false,
        emptyStateReason: null,
      }}
      branding={BRANDING}
      theme="LIGHT"
      currentTimeIso="2026-11-01T08:00:00.000Z"
      studio={EMPTY_SCREEN1_STUDIO_CONFIG}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("R16 full-cover ambient raster", () => {
  it("uses absolute full-surface cover for every activity kind", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientIllustrationClip[\s\S]*inset:\s*0/);
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*width:\s*100%/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*height:\s*100%/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\.activityTournament \.ambientIllustrationClip \.ambientImage[\s\S]*object-fit:\s*cover/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\.activityTraining \.ambientIllustrationClip \.ambientImage[\s\S]*object-fit:\s*cover/,
    );
    expect(AMBIENT_CSS).not.toMatch(/--ambient-raster-max-height/);
    expect(AMBIENT_CSS).not.toMatch(/max-height:\s*var\(--ambient-raster-max-height/);
    expect(AMBIENT_CSS).not.toMatch(/object-fit:\s*fill/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*100%\s*100%/);
  });

  it("removes R15 lower illustration mask/fade", () => {
    expect(AMBIENT_CSS).not.toMatch(/\.ambientIllustrationClip[\s\S]*mask-image:/);
    expect(AMBIENT_CSS).not.toMatch(/\.ambientIllustrationClip[\s\S]*-webkit-mask-image:/);
  });

  it("mounts raster inside opacity shell separate from the img element", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.querySelector('[data-venue-ambient-raster-opacity="true"]')).toBeTruthy();
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTraining \.ambientRasterOpacity[\s\S]*opacity:\s*var\(--ambient-image-opacity\)/,
    );
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*opacity:\s*1/);
  });
});

describe("R16 foreground isolation", () => {
  it("keeps foreground above background anchor with explicit opacity 1", () => {
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\.cardEventZone[\s\S]*z-index:\s*var\(--venue-ambient-z-foreground/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\.trainingMatrix[\s\S]*opacity:\s*1/,
    );
    expect(SCREEN1_CSS).toMatch(/\.operationalAmbientAnchor[\s\S]*z-index:\s*0/);
    expect(SCREEN1_CSS).toMatch(/\.operationalAmbientAnchor[\s\S]*isolation:\s*isolate/);
  });

  it("declares background stack z-index contract in ambient layer CSS", () => {
    expect(VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX).toEqual({
      baseAtmosphere: 0,
      raster: 1,
      scrims: 2,
      foreground: 10,
    });
    expect(AMBIENT_CSS).toMatch(
      new RegExp(
        `\\.baseActivityAtmosphere[\\s\\S]*z-index:\\s*var\\(${VENUE_OPERATIONAL_AMBIENT_STACK_Z_INDEX_CSS_VARS.baseAtmosphere}`,
      ),
    );
    expect(AMBIENT_CSS).toMatch(/\.ambientScrim[\s\S]*z-index:\s*var\(--venue-ambient-z-scrims/);
  });

  it("keeps scrims inside background stack below foreground grid", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientScrim[\s\S]*z-index:\s*var\(--venue-ambient-z-scrims/);
    const scrimIndex = AMBIENT_CSS.indexOf(".ambientScrim");
    const foregroundRule = SCREEN1_CSS.indexOf("--venue-ambient-z-foreground: 10");
    expect(scrimIndex).toBeGreaterThan(-1);
    expect(foregroundRule).toBeGreaterThan(-1);
  });
});

describe("R16 dense training foreground", () => {
  it("keeps all matrix cells in foreground stack without cell-level opacity fade", () => {
    expect(SCREEN1_CSS).toMatch(/\.trainingMatrixCell:nth-child\(1\) > \*[\s\S]*opacity:\s*1/);
    expect(SCREEN1_CSS).toMatch(/\.trainingMatrixCell:nth-child\(2\) > \*[\s\S]*opacity:\s*1/);
    expect(SCREEN1_CSS).toMatch(/\.trainingMatrixCell:nth-child\(3\) > \*[\s\S]*opacity:\s*1/);

    const nowIso = resolveWednesdayPreviewCurrentTimeIso("15:45");
    render(
      <InfoboardScreen1
        feed={buildWednesday20260826Feed(nowIso)}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso={nowIso}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );
    const trainingCard = screen
      .getAllByTestId("event-row")
      .find((row) => row.getAttribute("data-type") === "TRAINING");
    expect(trainingCard?.getAttribute("data-venue-operational-ambient")).toBe("true");
    const rows = within(trainingCard as HTMLElement).getAllByTestId("training-matrix-row");
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const row of rows) {
      expect(row.children.item(0)?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(row.children.item(1)?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(row.children.item(2)?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("R16 opacity contract", () => {
  it("applies activity raster opacity only on decorative shell", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT).toEqual({
      MATCH: 0.42,
      TOURNAMENT: 0.38,
      TRAINING: 0.34,
    });
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityMatch[\s\S]*--ambient-image-opacity:\s*0\.42/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTournament[\s\S]*--ambient-image-opacity:\s*0\.38/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTraining[\s\S]*--ambient-image-opacity:\s*0\.34/,
    );
  });
});

describe("R16 cover positioning tokens", () => {
  it("declares semantic object-position variables per activity", () => {
    expect(AMBIENT_CSS).toMatch(/\.activityMatch[\s\S]*--ambient-position-x:\s*0%/);
    expect(AMBIENT_CSS).toMatch(/\.activityTournament[\s\S]*--ambient-position-y:\s*16%/);
    expect(AMBIENT_CSS).toMatch(/\.activityTraining[\s\S]*--ambient-position-y:\s*4%/);
  });
});

describe("R16 MATCH known asset issue", () => {
  it("records pitch geometry issue without CSS disguise", () => {
    expect(KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY).toBe("YES");
    expect(AMBIENT_CSS).not.toMatch(/filter:\s*blur/);
    expect(AMBIENT_CSS).not.toMatch(/transform:\s*scaleX/);
    expect(resolveActivityAmbientSrc("MATCH", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.match,
    );
  });
});

describe("R16 locked invariants", () => {
  it("preserves grid and ambient architecture", () => {
    expect(VENUE_OPERATIONAL_AMBIENT_PRESENTATION).toEqual({ leftPercent: 15, widthPercent: 85 });
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
  });

  it("does not change canonical PNG paths", () => {
    expect(INFOBOARD_AMBIENT_ASSET_PATHS).toEqual({
      header: "/Infoboard/ambient/infoboard-header-ambient.png",
      jumbotron: "/Infoboard/ambient/infoboard-jumbotron-ambient.png",
      darkOperational: "/Infoboard/ambient/infoboard-dark-background.png",
      match: "/Infoboard/ambient/infoboard-match-ambient.png",
      tournament: "/Infoboard/ambient/infoboard-tournament-ambient.png",
      training: "/Infoboard/ambient/infoboard-training-ambient.png",
    });
  });
});
