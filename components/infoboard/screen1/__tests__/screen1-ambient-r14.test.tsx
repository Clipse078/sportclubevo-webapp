/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R14 — ambient depth & full-height atmosphere (automated contract).
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
import { VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT } from "@/lib/infoboard/screen1-ambient-depth";
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

describe("R14 activity-specific raster opacity", () => {
  it("declares separate opacity tokens per activity kind", () => {
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
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityMatch \.ambientImage[\s\S]*opacity:\s*var\(--ambient-image-opacity\)/,
    );
  });

  it("does not apply activity opacity tokens to header or jumbotron rasters", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(AMBIENT_CSS).toMatch(/\.headerAmbientLayer \.ambientImage[\s\S]*opacity:\s*0\.78/);
    expect(AMBIENT_CSS).toMatch(/\.jumbotronAmbientLayer \.ambientImage[\s\S]*opacity:\s*1/);
    expect(
      screen.getByTestId("venue-header-ambient").querySelector('[data-venue-ambient-base-atmosphere="true"]'),
    ).toBeNull();
    expect(
      screen.getByTestId("venue-jumbotron-ambient").querySelector('[data-venue-ambient-base-atmosphere="true"]'),
    ).toBeNull();
  });
});

describe("R14 full-height base atmosphere", () => {
  it("mounts base atmosphere behind width-driven raster in operational environment", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.querySelector('[data-venue-ambient-base-atmosphere="true"]')).toBeTruthy();
    expect(AMBIENT_CSS).toMatch(/\.baseActivityAtmosphere[\s\S]*inset:\s*0/);
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityMatch[\s\S]*--ambient-base-atmosphere:/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTournament[\s\S]*--ambient-base-atmosphere:/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTraining[\s\S]*--ambient-base-atmosphere:/,
    );
  });

  it("keeps raster width-driven with height auto (no stretch regressions)", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*width:\s*100%/);
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*height:\s*auto/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*cover/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*100%\s*100%/);
    expect(AMBIENT_CSS).not.toMatch(/object-fit:\s*fill/);
  });
});

describe("R14 architecture invariants", () => {
  it("preserves 15/85 ambient and 15/43/22/20 foreground grid", () => {
    expect(VENUE_OPERATIONAL_AMBIENT_PRESENTATION).toEqual({ leftPercent: 15, widthPercent: 85 });
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
  });

  it("excludes TIME from operational ambient anchor", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const anchor = screen.getByTestId("venue-activity-ambient").parentElement;
    expect(anchor?.getAttribute("data-venue-operational-ambient-anchor")).toBe("true");
    expect(anchor?.contains(screen.getByTestId("venue-activity-time"))).toBe(false);
  });

  it("mounts one raster instance per activity row", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const row = screen.getByTestId("event-row");
    expect(within(row).getAllByTestId("venue-activity-ambient")).toHaveLength(1);
    expect(
      within(row)
        .getByTestId("venue-activity-ambient")
        .querySelectorAll('img[data-venue-ambient-raster="true"]'),
    ).toHaveLength(1);
  });
});

describe("R14 dense training operational environment", () => {
  it("retains unified operational ambient on tall training matrix", () => {
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
    const ambient = within(trainingCard as HTMLElement).getByTestId("venue-training-matrix-ambient");
    expect(ambient.getAttribute("data-venue-ambient-kind")).toBe("TRAINING");
    expect(ambient.querySelector('[data-venue-ambient-base-atmosphere="true"]')).toBeTruthy();
    expect(resolveActivityAmbientSrc("TRAINING")).toBe(INFOBOARD_AMBIENT_ASSET_PATHS.training);
  });
});

describe("R14 separators and scrims", () => {
  it("softens internal operational column dividers", () => {
    expect(SCREEN1_CSS).toMatch(/--ib-zone-separator-operational-soft:\s*rgba\(11,\s*31,\s*58,\s*0\.05\)/);
  });

  it("uses localized scrims without adding a global opaque white wash", () => {
    expect(AMBIENT_CSS).toMatch(/\.activityMatch \.ambientScrim[\s\S]*linear-gradient/);
    expect(AMBIENT_CSS).not.toMatch(/\.activityMatch[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.9/);
  });
});

describe("R14 asset integrity", () => {
  it("does not reference modified ambient asset paths", () => {
    expect(INFOBOARD_AMBIENT_ASSET_PATHS).toEqual({
      header: "/Infoboard/ambient/infoboard-header-ambient.png",
      jumbotron: "/Infoboard/ambient/infoboard-jumbotron-ambient.png",
      match: "/Infoboard/ambient/infoboard-match-ambient.png",
      tournament: "/Infoboard/ambient/infoboard-tournament-ambient.png",
      training: "/Infoboard/ambient/infoboard-training-ambient.png",
    });
  });
});
