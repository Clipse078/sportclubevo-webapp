/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R22 — unified DARK operational activity backdrop (automated contract).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import {
  INFOBOARD_AMBIENT_ASSET_PATHS,
  resolveActivityAmbientSrc,
} from "@/lib/infoboard/screen1-ambient-assets";
import {
  AMBIENT_DARK_UNIFIED_POSITION_X,
  AMBIENT_DARK_UNIFIED_POSITION_Y,
  KABINE_FOREGROUND_OPACITY,
  VENUE_ACTIVITY_AMBIENT_DARK_BASE_ATMOSPHERE,
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_DARK,
} from "@/lib/infoboard/screen1-ambient-depth";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";

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

function renderSingle(event: InfoboardScreen1Event, theme: "DARK" | "LIGHT" = "DARK") {
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
      theme={theme}
      currentTimeIso="2026-11-01T08:00:00.000Z"
      studio={EMPTY_SCREEN1_STUDIO_CONFIG}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("R22 unified DARK operational backdrop", () => {
  it("resolves one shared dark asset for TRAINING, MATCH and TURNIER", () => {
    const unified = INFOBOARD_AMBIENT_ASSET_PATHS.darkOperational;
    expect(unified).toBe("/Infoboard/ambient/infoboard-dark-background.png");
    for (const eventType of ["TRAINING", "MATCH", "TOURNAMENT"] as const) {
      expect(resolveActivityAmbientSrc(eventType, "DARK")).toBe(unified);
    }
  });

  it("keeps LIGHT on per-activity artwork", () => {
    expect(resolveActivityAmbientSrc("MATCH", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.match,
    );
    expect(resolveActivityAmbientSrc("TRAINING", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.training,
    );
    expect(resolveActivityAmbientSrc("TOURNAMENT", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.tournament,
    );
  });

  it("mounts exactly one operational ambient anchor per DARK card", () => {
    renderSingle(baseEvent({ type: "MATCH" }), "DARK");
    const row = screen.getByTestId("event-row");
    expect(row.querySelectorAll('[data-venue-operational-ambient-anchor="true"]').length).toBe(
      1,
    );
    expect(row.getAttribute("data-venue-operational-ambient")).toBe("true");
    expect(
      row.querySelector('[data-venue-operational-surface="unified-dark"]'),
    ).toBeTruthy();
    const img = row.querySelector(
      '[data-venue-ambient-raster="true"]',
    ) as HTMLImageElement | null;
    expect(img?.getAttribute("src")).toBe(INFOBOARD_AMBIENT_ASSET_PATHS.darkOperational);
  });

  it("uses LIGHT activity artwork when theme is LIGHT", () => {
    renderSingle(baseEvent({ type: "TOURNAMENT" }), "LIGHT");
    const row = screen.getByTestId("event-row");
    const img = row.querySelector(
      '[data-venue-ambient-raster="true"]',
    ) as HTMLImageElement | null;
    expect(img?.getAttribute("src")).toBe(INFOBOARD_AMBIENT_ASSET_PATHS.tournament);
    expect(row.querySelector('[data-venue-operational-surface="unified-dark"]')).toBeNull();
  });

  it("declares DARK raster opacity on the decorative shell only", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_DARK).toBe(0.65);
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="dark"\]\s*\.activityMatch \.ambientRasterOpacity[\s\S]*opacity:\s*0\.65/,
    );
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*opacity:\s*1/);
    expect(KABINE_FOREGROUND_OPACITY).toBe(1);
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\.cardDressingRoomZone[\s\S]*opacity:\s*1/,
    );
  });

  it("uses center cover positioning and navy base atmosphere in DARK", () => {
    expect(VENUE_ACTIVITY_AMBIENT_DARK_BASE_ATMOSPHERE).toBe("#0A1828");
    expect(AMBIENT_DARK_UNIFIED_POSITION_X).toBe("50%");
    expect(AMBIENT_DARK_UNIFIED_POSITION_Y).toBe("50%");
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="dark"\]\s*\.activityMatch[\s\S]*--ambient-position-x:\s*50%/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="dark"\]\s*\.activityTraining[\s\S]*--ambient-base-atmosphere:\s*#0a1828/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*object-fit:\s*cover/,
    );
  });

  it("defines one operational ambient anchor spanning ACTIVITY + KABINE + PLATZ", () => {
    expect(SCREEN1_CSS).toMatch(/--ib-zone-operational-ambient-span:\s*85%/);
    expect(SCREEN1_CSS).toMatch(/\.operationalAmbientAnchor[\s\S]*width:\s*var\(--ib-zone-operational-ambient-span\)/);
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-surface="unified-dark"\][\s\S]*border-radius/,
    );
  });
});
