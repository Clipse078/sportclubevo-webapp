/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R6 — premium transport header bus icon upgrade.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS,
} from "@/lib/infoboard/screen2-direction-landmarks";
import { INFOBOARD_TRANSPORT_HEADER_BUS_ICON_PATH } from "@/lib/infoboard/screen2-transport-header-icon";
import {
  SCREEN2_PRESENTATION_ANLAGEPLAN_MS,
  SCREEN2_PRESENTATION_OV_MS,
} from "@/lib/infoboard/screen2-presentation-rotation";
import { SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION } from "@/lib/infoboard/screen2-body-shell-sizing";
import type { TransportDeparture, TransportResult } from "@/lib/transport/transport-types";

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const BASE_DEPARTURE: TransportDeparture = {
  line: "48",
  category: "bus",
  categoryLabel: "BUS",
  destination: "Basel, Bachgraben",
  plannedDeparture: "2026-09-02T18:48:00+0200",
  realtimeDeparture: "2026-09-02T18:48:00+0200",
  delayMinutes: null,
  platform: null,
  direction: "Basel, Bachgraben",
  nextStopId: "8578171",
  nextStopName: "Allschwil, Kreuzstrasse",
  provider: "opendata.ch",
  hasRealtime: true,
};

function makeTransport(): TransportResult {
  return {
    isAvailable: true,
    stationDisplayName: "Allschwil, Im Brüel",
    stationId: "8578172",
    departures: [BASE_DEPARTURE],
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
        departures: [BASE_DEPARTURE],
      },
    ],
    fetchedAt: "2026-09-02T16:40:00.000Z",
    isStale: false,
    hasRealtimeData: true,
  };
}

describe("SCE-INFOBOARD-R23R6 transport header bus icon", () => {
  it("references the approved monochrome bus PNG in the transport header", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const icon = screen.getByTestId("screen2-transport-bus-icon");
    expect(icon.tagName).toBe("SPAN");
    expect(icon.getAttribute("data-asset-src")).toBe(INFOBOARD_TRANSPORT_HEADER_BUS_ICON_PATH);
    expect(existsSync(join(process.cwd(), "public", INFOBOARD_TRANSPORT_HEADER_BUS_ICON_PATH))).toBe(
      true,
    );
  });

  it("does not render the generic BusFront lucide pictogram in the header", () => {
    const ts = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.tsx");
    expect(ts).not.toContain("BusFront");
    expect(ts).not.toMatch(/from\s+"lucide-react"[\s\S]*BusFront/);

    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-bus-icon").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("defines LIGHT and DARK presentation rules for the header bus raster", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    const tintedBlock = css.match(/\.tintedRasterIcon\s*\{[^}]+\}/)?.[0] ?? "";
    expect(tintedBlock).toContain("mask-size: contain");
    expect(css).toMatch(/\.slide\[data-theme="light"\][\s\S]*--screen2-transport-bus-icon-tint:/);

    const { rerender } = render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        theme="dark"
      />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("dark");

    rerender(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        theme="light"
      />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");
  });

  it("preserves direction landmarks, outward arrows, and five-departure rotation invariants", () => {
    expect(SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION).toBe(5);
    expect(SCREEN2_PRESENTATION_ANLAGEPLAN_MS).toBe(25_000);
    expect(SCREEN2_PRESENTATION_OV_MS).toBe(20_000);

    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-direction-arrow-left")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-right")).toBeTruthy();
    expect(
      screen.getByTestId("screen2-transport-direction-landmark-allschwil-zentrum").getAttribute(
        "data-asset-src",
      ),
    ).toBe(INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.allschwilDorf);
    expect(
      screen.getByTestId("screen2-transport-direction-landmark-bachgraben-basel").getAttribute(
        "data-asset-src",
      ),
    ).toBe(INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.basel);

    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.directionArrow[\s\S]*clamp\(48px,\s*3\.6vw,\s*64px\)/);
    expect(css).not.toContain(".titleIconSvg");
  });
});
