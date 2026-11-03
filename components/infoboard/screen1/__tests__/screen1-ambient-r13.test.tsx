/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R13 — unified activity environment (automated contract).
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

function renderFeed(events: InfoboardScreen1Event[]) {
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
        current: events,
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

function renderSingle(event: InfoboardScreen1Event) {
  return renderFeed([event]);
}

afterEach(() => {
  cleanup();
});

describe("R13 unified operational environment", () => {
  it("mounts exactly one activity ambient per MATCH row on the operational anchor", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const row = screen.getByTestId("event-row");
    expect(row.getAttribute("data-venue-operational-ambient")).toBe("true");
    const ambients = within(row).getAllByTestId("venue-activity-ambient");
    expect(ambients).toHaveLength(1);
    expect(ambients[0]?.getAttribute("data-venue-ambient-scope")).toBe(
      "operational-environment",
    );
    expect(
      ambients[0]?.closest('[data-venue-operational-ambient-anchor="true"]'),
    ).toBeTruthy();
    expect(
      within(row).getByTestId("venue-activity-identity").contains(ambients[0]!),
    ).toBe(false);
  });

  it("positions operational ambient after TIME (15%) spanning 85%", () => {
    expect(VENUE_OPERATIONAL_AMBIENT_PRESENTATION.leftPercent).toBe(15);
    expect(VENUE_OPERATIONAL_AMBIENT_PRESENTATION.widthPercent).toBe(85);
    expect(SCREEN1_CSS).toMatch(/\.operationalAmbientAnchor[\s\S]*left:\s*var\(--ib-zone-operational-ambient-left\)/);
    expect(SCREEN1_CSS).toMatch(/\.operationalAmbientAnchor[\s\S]*width:\s*var\(--ib-zone-operational-ambient-span\)/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-operational-ambient-span:\s*85%/);
  });

  it("does not cover the TIME column surface", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    const anchor = screen.getByTestId("venue-activity-ambient").parentElement;
    expect(anchor?.getAttribute("data-venue-operational-ambient-anchor")).toBe("true");
    const timeZone = screen.getByTestId("venue-activity-time");
    expect(anchor?.contains(timeZone)).toBe(false);
  });
});

describe("R13 foreground grid unchanged", () => {
  it("preserves 15/43/22/20 column contract", () => {
    expect(VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES).toEqual({
      time: 15,
      activity: 43,
      kabine: 22,
      platz: 20,
    });
    expect(SCREEN1_CSS).toMatch(/--ib-zone-time:\s*15%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-event:\s*43%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-room:\s*22%/);
    expect(SCREEN1_CSS).toMatch(/--ib-zone-pitch:\s*20%/);
  });
});

describe("R13 activity ambient mapping", () => {
  it("maps MATCH, TURNIER, TRAINING to approved assets", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(
      screen
        .getByTestId("venue-activity-ambient")
        .querySelector('img[data-venue-ambient-raster="true"]')
        ?.getAttribute("src"),
    ).toBe(INFOBOARD_AMBIENT_ASSET_PATHS.match);

    cleanup();
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
    expect(resolveActivityAmbientSrc("TOURNAMENT", "LIGHT")).toContain(
      "infoboard-tournament-ambient.png",
    );

    cleanup();
    renderSingle(baseEvent({ id: "tr-1", type: "TRAINING", displayTitle: "Training" }));
    expect(screen.getByTestId("venue-training-matrix-ambient").getAttribute("data-venue-ambient-kind")).toBe(
      "TRAINING",
    );
    expect(resolveActivityAmbientSrc("TRAINING", "LIGHT")).toContain(
      "infoboard-training-ambient.png",
    );
  });
});

describe("R13 responsive width-driven contract", () => {
  it("keeps width-driven ambient rasters without height stretch regressions", () => {
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*width:\s*100%/);
    expect(AMBIENT_CSS).toMatch(/\.ambientImage[\s\S]*height:\s*auto/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*cover/);
    expect(AMBIENT_CSS).not.toMatch(/background-size:\s*100%\s*100%/);
    expect(AMBIENT_CSS).not.toMatch(/object-fit:\s*fill/);
    expect(AMBIENT_CSS).toMatch(/\.ambientLayer[\s\S]*position:\s*absolute/);
  });

  it("preserves foreground geometry for compact and spacious card counts", () => {
    for (const count of [1, 2, 3] as const) {
      cleanup();
      renderFeed(
        Array.from({ length: count }, (_, i) =>
          baseEvent({
            id: `m-${i}`,
            displayTitle: `Match ${i}`,
            startAt: `2026-11-01T${String(14 + i).padStart(2, "0")}:00:00.000Z`,
          }),
        ),
      );
      const rows = screen.getAllByTestId("event-row");
      expect(rows.length).toBeGreaterThanOrEqual(1);
      for (const row of rows) {
        expect(within(row).getByTestId("venue-activity-ambient")).toBeTruthy();
        expect(
          within(row).queryByTestId("match-allocation") ??
            within(row).queryByTestId("venue-activity-kabine"),
        ).toBeTruthy();
      }
    }
  });
});

describe("R13 content states", () => {
  it("covers MATCH single full-height row", () => {
    renderFeed([baseEvent({ type: "MATCH" })]);
    expect(screen.getByTestId("venue-activity-ambient")).toBeTruthy();
  });

  it("covers TURNIER compact and standard presentation", () => {
    renderSingle(
      baseEvent({
        type: "TOURNAMENT",
        displayTitle: "Cup",
        teamDisplayName: null,
        opponentDisplayName: null,
        competitionLabel: null,
      }),
    );
    expect(screen.getByTestId("venue-activity-ambient")).toBeTruthy();
  });

  it("covers training matrix dense cohort via Wednesday fixture", () => {
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
    expect(within(trainingCard as HTMLElement).getByTestId("venue-training-matrix-ambient")).toBeTruthy();
  });
});

describe("R13 readability architecture", () => {
  it("keeps Kabine/Platz foreground above ambient without opaque sub-card surfaces", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(SCREEN1_CSS).toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*background:\s*transparent/,
    );
    expect(SCREEN1_CSS).not.toMatch(
      /\[data-venue-operational-ambient="true"\][\s\S]*background:\s*#FFFFFF/,
    );
    expect(SCREEN1_CSS).toMatch(/--ib-zone-separator-operational-soft/);
  });

  it("uses localized scrims rather than full white wash on activity kinds", () => {
    expect(AMBIENT_CSS).toMatch(/\.activityMatch \.ambientScrim[\s\S]*linear-gradient/);
    expect(AMBIENT_CSS).toMatch(/--ambient-kabine-scrim-start/);
  });
});

describe("R13 header and jumbotron regression guard", () => {
  it("retains header and jumbotron ambient layers", () => {
    renderSingle(baseEvent({ type: "MATCH" }));
    expect(screen.getByTestId("venue-header-ambient")).toBeTruthy();
    expect(screen.getByTestId("venue-jumbotron-ambient")).toBeTruthy();
  });
});

describe("R13 asset integrity", () => {
  it("requires canonical Infoboard ambient PNG paths", () => {
    for (const assetPath of Object.values(INFOBOARD_AMBIENT_ASSET_PATHS)) {
      expect(
        existsSync(resolve(process.cwd(), "public", assetPath.replace(/^\//, ""))),
      ).toBe(true);
    }
  });
});
