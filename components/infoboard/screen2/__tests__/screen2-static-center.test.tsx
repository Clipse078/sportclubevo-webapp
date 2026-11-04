/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R21 — rotating center layout focused tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfoboardAnlageplan } from "@/components/infoboard/anlageplan/InfoboardAnlageplan";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { PREVIEW_FIXTURE } from "@/components/infoboard/screen1/screen1-preview-fixture";
import { Screen2CenterStack } from "@/components/infoboard/screen2/Screen2CenterStack";
import type { AnlageplanLivePayload } from "@/lib/publishing/infoboard/anlageplan-live-service";
import {
  SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS,
  SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT,
  SCREEN2_CENTER_HEIGHT_PX,
  SCREEN2_CENTER_WIDTH_PX,
  computeAnlageplanMapDimensions,
} from "@/lib/infoboard/screen2-body-shell-sizing";
import { SCREEN2_PRESENTATION_ANLAGEPLAN_MS } from "@/lib/infoboard/screen2-presentation-rotation";
import type { TransportResult } from "@/lib/transport/transport-types";

const REPO_ROOT = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function makeAnlageplanPayload(): AnlageplanLivePayload {
  return {
    screen2: {
      feed: {
        generatedAt: "2026-09-01T10:00:00.000Z",
        tenant: {
          id: "tenant-fca",
          key: "fc-allschwil",
          name: "FC Allschwil",
          timezone: "Europe/Zurich",
        },
        displayDate: "2026-09-01",
        isStale: false,
        facilityName: "Sportanlage",
        pitches: [],
        dressingRooms: [],
        unallocated: [],
      },
      branding: {
        clubLogoSrc: null,
        productLogoSrc: null,
        tenantPrimaryColor: null,
        tenantSecondaryColor: null,
      },
      currentTimeIso: "2026-09-01T10:00:00.000Z",
      theme: "DARK",
    },
    anlageplanConfig: {
      version: 1,
      elements: [],
      backgroundTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    backgroundUrl: null,
    backgroundTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    currentTimeIso: "2026-09-01T10:00:00.000Z",
  };
}

const TRANSPORT: TransportResult = {
  isAvailable: true,
  stationDisplayName: "Allschwil, Im Brüel",
  stationId: "8578172",
  departures: [
    {
      line: "48",
      category: "bus",
      categoryLabel: "BUS",
      destination: "Basel, Bachgraben",
      plannedDeparture: "2026-09-02T18:48:00+0200",
      realtimeDeparture: "2026-09-02T18:51:00+0200",
      delayMinutes: 3,
      platform: null,
      direction: "Basel, Bachgraben",
      nextStopId: "8578171",
      nextStopName: "Allschwil, Kreuzstrasse",
      provider: "opendata.ch",
      hasRealtime: true,
    },
  ],
  directionGroups: [
    {
      id: "allschwil-zentrum",
      displayName: "Richtung Allschwil Zentrum",
      orientation: "left",
      departures: [],
    },
    {
      id: "bachgraben-basel",
      displayName: "Richtung Bachgraben / Basel",
      orientation: "right",
      departures: [
        {
          line: "48",
          category: "bus",
          categoryLabel: "BUS",
          destination: "Basel, Bachgraben",
          plannedDeparture: "2026-09-02T18:48:00+0200",
          realtimeDeparture: "2026-09-02T18:51:00+0200",
          delayMinutes: 3,
          platform: null,
          direction: "Basel, Bachgraben",
          nextStopId: "8578171",
          nextStopName: "Allschwil, Kreuzstrasse",
          provider: "opendata.ch",
          hasRealtime: true,
        },
      ],
    },
  ],
  fetchedAt: "2026-09-02T16:40:00.000Z",
  isStale: false,
  hasRealtimeData: true,
};

vi.mock("@/components/infoboard/kiosk-transport", () => ({
  useKioskTransport: (initial: TransportResult | null) => initial,
}));

describe("SCE-INFOBOARD-V2-01-R21 — rotating center layout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders rotator with Anlageplan initially when transport is configured", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    expect(screen.getByTestId("anlageplan-slide")).toBeTruthy();
    expect(screen.getByTestId("anlageplan-map-canvas")).toBeTruthy();
    expect(screen.getByTestId("screen2-center-stack")).toBeTruthy();
    expect(screen.getByTestId("screen2-center-rotator")).toBeTruthy();
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "anlageplan",
    );
  });

  it("does not render sponsor placeholder rails", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    expect(screen.queryByTestId("screen2-sponsor-rail-left")).toBeNull();
    expect(screen.queryByTestId("screen2-sponsor-rail-right")).toBeNull();
  });

  it("keeps header and footer present", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    expect(screen.getByTestId("kiosk-shell-header")).toBeTruthy();
    expect(screen.getByTestId("kiosk-shell-footer")).toBeTruthy();
  });

  it("rotates center content after configured durations", async () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
        liveClock={true}
      />,
    );

    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "anlageplan",
    );

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
    });

    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
    expect(screen.getByTestId("screen2-transport-slide")).toBeTruthy();
  });

  it("Anlageplan dimensions/fit contract uses full center width", () => {
    const mapDimensions = computeAnlageplanMapDimensions(
      SCREEN2_CENTER_WIDTH_PX,
      SCREEN2_CENTER_HEIGHT_PX,
    );

    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.anlageplanMapWidthPx).toBe(
      mapDimensions.widthPx,
    );
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.anlageplanMapHeightPx).toBe(
      mapDimensions.heightPx,
    );
    expect(SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS.widthPx).toBe(mapDimensions.widthPx);
    expect(SCREEN2_ANLAGEPLAN_MAP_DIMENSIONS.heightPx).toBe(mapDimensions.heightPx);
    expect(mapDimensions.widthPx).toBeGreaterThan(1100);

    const anlageplanCss = readRepoFile(
      "components/infoboard/anlageplan/InfoboardAnlageplan.module.css",
    );
    expect(anlageplanCss).toContain("aspect-ratio: 16 / 9");
    expect(anlageplanCss).toContain("width: min(100cqw, calc(100cqh * 16 / 9))");
    expect(anlageplanCss).toContain("height: min(100cqh, calc(100cqw * 9 / 16))");
  });

  it("Screen2BodyShell is full-width single column", () => {
    const shellCss = readRepoFile("components/infoboard/screen2/Screen2BodyShell.module.css");
    const shellTs = readRepoFile("components/infoboard/screen2/Screen2BodyShell.tsx");
    const sizing = readRepoFile("lib/infoboard/screen2-body-shell-sizing.ts");

    expect(shellCss).not.toContain("grid-template-columns:");
    expect(shellTs).not.toContain("Screen2SponsorRail");
    expect(sizing).toContain("SCREEN2_SPONSOR_RAIL_WIDTH_PX = 0");
  });

  it("Screen 1 unaffected", () => {
    const screen1 = readRepoFile("components/infoboard/screen1/InfoboardScreen1.tsx");
    expect(screen1).not.toContain("Screen2CenterStack");
    expect(screen1).not.toContain("Screen2TransportSlide");

    render(<InfoboardScreen1 feed={PREVIEW_FIXTURE} liveClock={false} />);

    expect(screen.queryByTestId("screen2-transport-slide")).toBeNull();
    expect(screen.getByTestId("infoboard-screen1-root")).toBeTruthy();
  });

  it("Screen2CenterStack keeps map and transport mounted in rotator panels", () => {
    render(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={TRANSPORT}
        refreshIntervalSeconds={45}
        live={false}
      >
        <div data-testid="anlageplan-child">Anlageplan</div>
      </Screen2CenterStack>,
    );

    const stack = screen.getByTestId("screen2-center-stack");
    expect(stack.contains(screen.getByTestId("anlageplan-child"))).toBe(true);
    expect(stack.contains(screen.getByTestId("screen2-transport-slide"))).toBe(true);
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-compact")).toBe("false");
  });

  it("uses Screen2PresentationRotator in the center stack", () => {
    const anlageplan = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.tsx");
    expect(anlageplan).toContain("Screen2CenterStack");
    expect(readRepoFile("components/infoboard/screen2/Screen2CenterStack.tsx")).toContain(
      "Screen2PresentationRotator",
    );
  });
});
