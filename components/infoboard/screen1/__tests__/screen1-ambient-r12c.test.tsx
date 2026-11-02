/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R12C — ambient rendering calibration (automated contract).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import { INFOBOARD_AMBIENT_ASSET_PATHS } from "@/lib/infoboard/screen1-ambient-assets";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";

const AMBIENT_CSS = readFileSync(
  resolve(
    process.cwd(),
    "components/infoboard/venue-display/VenueAmbientLayer.module.css",
  ),
  "utf8",
);
const SCREEN1_CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
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

function renderLightScreen1(event: InfoboardScreen1Event = baseEvent({ type: "MATCH" })) {
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
      announcement={{
        enabled: true,
        text: "BITTE DIE KABINEN BESENREIN HINTERLASSEN",
      }}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("R12C approved asset paths unchanged", () => {
  it("keeps canonical Infoboard ambient filenames", () => {
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.match).toBe(
      "/Infoboard/ambient/infoboard-match-ambient.png",
    );
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.tournament).toBe(
      "/Infoboard/ambient/infoboard-tournament-ambient.png",
    );
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.training).toBe(
      "/Infoboard/ambient/infoboard-training-ambient.png",
    );
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.header).toBe(
      "/Infoboard/ambient/infoboard-header-ambient.png",
    );
    expect(INFOBOARD_AMBIENT_ASSET_PATHS.jumbotron).toBe(
      "/Infoboard/ambient/infoboard-jumbotron-ambient.png",
    );
  });
});

describe("R12C width-driven scale invariants", () => {
  it("uses R16 full-surface object-fit cover for activity rasters", () => {
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*cover/);
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*width:\s*100%/);
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*height:\s*100%/,
    );
    expect(AMBIENT_CSS).toMatch(
      /\.activityMatch \.ambientIllustrationClip \.ambientImage[\s\S]*object-fit:\s*cover/,
    );
  });

  it("preserves grid 15/43/22/20", () => {
    expect(SCREEN1_CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-event:\s*43%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-room:\s*22%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-pitch:\s*20%/);
  });
});

describe("R12C activity-specific positioning", () => {
  it("declares semantic ambient position variables per activity kind", () => {
    expect(AMBIENT_CSS).toMatch(/\.activityMatch[\s\S]*--ambient-position-x/);
    expect(AMBIENT_CSS).toMatch(/\.activityTournament[\s\S]*--ambient-position-x/);
    expect(AMBIENT_CSS).toMatch(/\.activityTraining[\s\S]*--ambient-position-x/);
    expect(AMBIENT_CSS).toMatch(
      /object-position:\s*var\(--ambient-position-x[\s\S]*var\(--ambient-position-y/,
    );
  });
});

describe("R12C jumbotron dark communication treatment", () => {
  it("marks jumbotron as dark surface and avoids light white wash scrim", () => {
    renderLightScreen1();
    const jumbotron = screen.getByTestId("venue-jumbotron-ambient");
    expect(jumbotron.getAttribute("data-venue-ambient-surface")).toBe("dark");
    expect(AMBIENT_CSS).toMatch(
      /\[data-shell-theme="light"\]\s*\.jumbotronAmbientLayer\s*\.ambientScrim[\s\S]*rgba\(10,\s*24,\s*40/,
    );
    expect(AMBIENT_CSS).not.toMatch(
      /\[data-shell-theme="light"\]\s*\.jumbotronAmbientLayer\s*\.ambientScrim[\s\S]*rgba\(255,\s*255,\s*255,\s*0\.8/,
    );
    expect(AMBIENT_CSS).toMatch(/\.jumbotronAmbientLayer\s*\.ambientImage[\s\S]*opacity:\s*1/);
  });
});

describe("R12C header light treatment", () => {
  it("retains header ambient layer on light shell theme", () => {
    renderLightScreen1();
    expect(screen.getByTestId("venue-header-ambient")).toBeTruthy();
    expect(screen.getByTestId("venue-header-tenant-accent")).toBeTruthy();
    expect(AMBIENT_CSS).toMatch(/\.headerAmbientLayer\s*\.ambientScrim[\s\S]*rgba\(255,\s*255,\s*255/);
  });
});

describe("R12C decorative flow contract", () => {
  it("keeps ambient layers absolute and out of layout", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*position:\s*absolute/);
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*pointer-events:\s*none/);
  });

  it("uses R16 per-activity raster opacity on light operational artwork shell", () => {
    expect(AMBIENT_CSS).toMatch(/--ambient-image-opacity:\s*0\.42/);
    expect(AMBIENT_CSS).toMatch(
      /\[data-theme="light"\]\s*\.activityMatch \.ambientRasterOpacity[\s\S]*opacity:\s*var\(--ambient-image-opacity\)/,
    );
    expect(AMBIENT_CSS).not.toMatch(
      /\[data-shell-theme="light"\]\s*\.ambientImage[\s\S]*opacity:\s*0\.55/,
    );
  });
});
