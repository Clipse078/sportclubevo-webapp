/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R15 — ambient legibility & full-card coverage (automated contract).
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

describe("R15 activity-specific raster opacity", () => {
  it("lowers light-theme artwork opacity per activity kind", () => {
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

  it("does not change header or jumbotron raster opacity tiers", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(AMBIENT_CSS).toMatch(/\.headerAmbientLayer \.ambientImage[\s\S]*opacity:\s*0\.78/);
    expect(AMBIENT_CSS).toMatch(/\.jumbotronAmbientLayer \.ambientImage[\s\S]*opacity:\s*1/);
  });
});

describe("R15 full-card environment", () => {
  it("keeps full-height base atmosphere for every activity kind", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.querySelector('[data-venue-ambient-base-atmosphere="true"]')).toBeTruthy();
    expect(AMBIENT_CSS).toMatch(/\.baseActivityAtmosphere[\s\S]*inset:\s*0/);
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityMatch[\s\S]*--ambient-base-atmosphere:\s*#fff6f5/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTournament[\s\S]*--ambient-base-atmosphere:\s*#fff9f4/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityTraining[\s\S]*--ambient-base-atmosphere:\s*#f5f8ff/,
    );
  });

  it("prevents plain-white fallback surfaces on operational columns", () => {
    expect(AMBIENT_CSS).not.toMatch(/\.ambientIllustrationClip[\s\S]*mask-image:\s*linear-gradient/);
    expect(AMBIENT_CSS).not.toMatch(
      /\[data-theme="light"\]\s*\.activityMatch[\s\S]*background:\s*#FFFFFF/,
    );
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*background:\s*transparent/,
    );
  });
});

describe("R15 illustration scaling", () => {
  it("uses aspect-preserving cover without fill stretch (superseded by R16 full-height cover)", () => {
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*object-fit:\s*cover/,
    );
    expect(AMBIENT_CSS).not.toMatch(/--ambient-raster-max-height:/);
    expect(AMBIENT_CSS).not.toMatch(/object-fit:\s*fill/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*100%\s*100%/);
    expect(AMBIENT_CSS).not.toMatch(/width:\s*100%[\s\S]*height:\s*100%[\s\S]*object-fit:\s*fill/);
  });

  it("mounts illustration inside a single clip per operational ambient row", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.querySelector('[data-venue-ambient-illustration-clip="true"]')).toBeTruthy();
    expect(
      ambient.querySelectorAll('img[data-venue-ambient-raster="true"]'),
    ).toHaveLength(1);
  });
});

describe("R15 Kabine readability protection", () => {
  it("declares localized Kabine readability veils without opaque sub-cards", () => {
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\[data-venue-column="kabine"\]\.cardDressingRoomZone::before/,
    );
    expect(SCREEN1_CSS).toMatch(/\.trainingMatrixCell:nth-child\(2\)::before/);
    expect(SCREEN1_CSS).not.toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*\[data-venue-column="kabine"\][\s\S]*background:\s*#FFFFFF/,
    );
  });

  it("protects dense training matrix Kabine cells", () => {
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
      const kabineCell = row.children.item(1);
      expect(kabineCell?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("R15 Platz readability", () => {
  it("relies on existing pitch pills without extra Platz veils", () => {
    expect(SCREEN1_CSS).toMatch(/\.destPitchValue[\s\S]*background:/);
    expect(SCREEN1_CSS).not.toMatch(/\.trainingMatrixCell:nth-child\(3\)::before/);
  });
});

describe("R15 MATCH known asset issue", () => {
  it("records unrealistic source pitch geometry without CSS disguise", () => {
    expect(KNOWN_ASSET_ISSUE_MATCH_PITCH_GEOMETRY).toBe("YES");
    expect(AMBIENT_CSS).not.toMatch(/filter:\s*blur/);
    expect(AMBIENT_CSS).not.toMatch(/transform:\s*scaleX/);
    expect(resolveActivityAmbientSrc("MATCH", "LIGHT")).toBe(
      INFOBOARD_AMBIENT_ASSET_PATHS.match,
    );
  });
});

describe("R15 architecture invariants", () => {
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
    expect(anchor?.contains(screen.getByTestId("venue-activity-time"))).toBe(false);
  });
});

describe("R15 asset integrity", () => {
  it("does not reference modified ambient asset paths", () => {
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
