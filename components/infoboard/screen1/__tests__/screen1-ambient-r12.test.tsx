/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R12 — ambient visual identity (automated contract).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import {
  INFOBOARD_AMBIENT_ASSET_PATHS,
  resolveActivityAmbientSrc,
} from "@/lib/infoboard/screen1-ambient-assets";
import { resolveVenueHeaderPresentationTokens } from "@/lib/infoboard/venue-header-presentation";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import {
  buildWednesday20260826Feed,
  resolveWednesdayPreviewCurrentTimeIso,
} from "@/components/infoboard/screen1/wednesday-2026-08-26-fixture";

const CSS = readFileSync(
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

describe("R12 ambient asset mapping", () => {
  it("maps MATCH, TURNIER, TRAINING to approved filenames", () => {
    expect(resolveActivityAmbientSrc("MATCH")).toContain("infoboard-match-ambient.png");
    expect(resolveActivityAmbientSrc("TOURNAMENT")).toContain(
      "infoboard-tournament-ambient.png",
    );
    expect(resolveActivityAmbientSrc("TRAINING")).toContain(
      "infoboard-training-ambient.png",
    );
  });
});

describe("R12 activity presentation", () => {
  it("renders match ambient on MATCH activity column only", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.getAttribute("data-venue-ambient-kind")).toBe("MATCH");
    const raster = ambient.querySelector('img[data-venue-ambient-raster="true"]');
    expect(raster?.getAttribute("src")).toBe(INFOBOARD_AMBIENT_ASSET_PATHS.match);
  });

  it("renders tournament ambient for TURNIER", () => {
    renderSingle(
      baseEvent({
        id: "t-1",
        type: "TOURNAMENT",
        displayTitle: "Herbstcup",
        teamDisplayName: null,
        opponentDisplayName: null,
        competitionLabel: null,
      }),
    );
    expect(screen.getByTestId("venue-activity-ambient").getAttribute("data-venue-ambient-kind")).toBe(
      "TOURNAMENT",
    );
  });

  it("does not attach activity ambient for unsupported types", () => {
    renderSingle(baseEvent({ id: "o-1", type: "OTHER", displayTitle: "Event" }));
    expect(screen.queryByTestId("venue-activity-ambient")).toBeNull();
  });
});

describe("R12 decorative contract", () => {
  it("marks ambient layers aria-hidden and non-interactive in CSS", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*pointer-events:\s*none/);
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*width:\s*100%/);
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*height:\s*auto/);
    expect(AMBIENT_CSS).not.toMatch(/\.ambientImage[\s\S]*height:\s*100%/);
  });

  it("keeps ambient DOM accessibility-hidden", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const ambient = screen.getByTestId("venue-activity-ambient");
    expect(ambient.getAttribute("aria-hidden")).toBe("true");
    expect(ambient.style.pointerEvents).not.toBe("auto");
  });
});

describe("R12 grid geometry unchanged", () => {
  it("preserves 15/43/22/20 column contract", () => {
    expect(CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(CSS).toMatch(/--ib-zone-event:\s*43%/);
    expect(CSS).toMatch(/--ib-zone-room:\s*22%/);
    expect(CSS).toMatch(/--ib-zone-pitch:\s*20%/);
  });
});

describe("R12 height integrity", () => {
  it("does not let ambient layers participate in card height (absolute positioning)", () => {
    expect(CSS).toMatch(/\.eventCard[\s\S]*position:\s*relative/);
    expect(CSS).toMatch(/\.trainingMatrixAmbientAnchor[\s\S]*position:\s*absolute/);
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*position:\s*absolute/);
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*inset:\s*0/);
  });

  it("retains content-driven card flex contract", () => {
    expect(CSS).toMatch(/\.eventCard[\s\S]*flex-grow:\s*0/);
    expect(CSS).toMatch(/\.eventCard[\s\S]*flex-shrink:\s*0/);
  });
});

describe("R12 density fixtures", () => {
  it("exercises Wednesday fixture training matrix and match ambients", () => {
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
      .find(
        (row) =>
          row.getAttribute("data-type") === "TRAINING" &&
          row.getAttribute("data-training-count") === "4",
      );
    expect(trainingCard).toBeTruthy();
    expect(
      within(trainingCard as HTMLElement).getByTestId("venue-training-matrix-ambient"),
    ).toBeTruthy();
  });

  it("supports compact and spacious card counts without ambient layout coupling", () => {
    for (const count of ["1", "2", "3"] as const) {
      cleanup();
      renderSingle(
        baseEvent({
          id: `match-${count}`,
          type: "MATCH",
          displayTitle: `Match ${count}`,
        }),
      );
      expect(screen.getByTestId("venue-activity-ambient")).toBeTruthy();
    }
  });
});

describe("R12 header and jumbotron", () => {
  it("renders tenant header ambient and accent with real tenant content", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(screen.getByTestId("venue-header-ambient")).toBeTruthy();
    expect(screen.getByTestId("venue-header-tenant-accent")).toBeTruthy();
    expect(screen.getByTestId("kiosk-header-club-name").textContent).toContain("FC Allschwil");
  });

  it("uses primary-only accent gradient when secondary is absent", () => {
    const tokens = resolveVenueHeaderPresentationTokens({
      tenantPrimaryColor: "#112233",
      tenantSecondaryColor: null,
    });
    expect(tokens.accentGradient).toBe("#112233");
  });

  it("renders jumbotron ambient independently of announcement text", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(screen.getByTestId("venue-jumbotron-ambient")).toBeTruthy();
    expect(screen.getByText(/BESENREIN/i)).toBeTruthy();
    expect(screen.getByAltText("SportClubEvo")).toBeTruthy();
  });
});

describe("R12 raster safety guard", () => {
  it("requires public ambient files at Infoboard path", () => {
    for (const assetPath of Object.values(INFOBOARD_AMBIENT_ASSET_PATHS)) {
      expect(
        existsSync(resolve(process.cwd(), "public", assetPath.replace(/^\//, ""))),
      ).toBe(true);
    }
  });
});
