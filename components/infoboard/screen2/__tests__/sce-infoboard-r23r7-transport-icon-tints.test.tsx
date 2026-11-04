/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R7 — Screen 2 ÖV raster icon color harmonization.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS,
} from "@/lib/infoboard/screen2-direction-landmarks";
import { INFOBOARD_TRANSPORT_HEADER_BUS_ICON_PATH } from "@/lib/infoboard/screen2-transport-header-icon";
import { SCREEN2_TRANSPORT_ICON_TINTS } from "@/lib/infoboard/screen2-transport-icon-tints";
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
        departures: [{ ...BASE_DEPARTURE, destination: "Allschwil, Zentrum", line: "11" }],
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

describe("SCE-INFOBOARD-R23R7 transport icon tints", () => {
  it("keeps the three approved PNG asset paths on masked presentation elements", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-bus-icon").getAttribute("data-asset-src")).toBe(
      INFOBOARD_TRANSPORT_HEADER_BUS_ICON_PATH,
    );
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
  });

  it("applies distinct bus cyan and shared landmark soft-blue tint classes", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const bus = screen.getByTestId("screen2-transport-bus-icon");
    const leftLandmark = screen.getByTestId("screen2-transport-direction-landmark-allschwil-zentrum");
    const rightLandmark = screen.getByTestId("screen2-transport-direction-landmark-bachgraben-basel");

    expect(bus.className).toMatch(/transportBusIconTint/);
    expect(leftLandmark.className).toMatch(/directionLandmarkTint/);
    expect(rightLandmark.className).toMatch(/directionLandmarkTint/);
    expect(bus.className).not.toMatch(/directionLandmarkTint/);
  });

  it("scopes DARK and LIGHT tint tokens on the slide shell only", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toContain(`--screen2-transport-bus-icon-tint: ${SCREEN2_TRANSPORT_ICON_TINTS.dark.bus.toLowerCase()}`);
    expect(css).toContain(
      `--screen2-transport-landmark-icon-tint: ${SCREEN2_TRANSPORT_ICON_TINTS.dark.landmark.toLowerCase()}`,
    );
    expect(css).toMatch(
      new RegExp(
        `\\.slide\\[data-theme="light"\\][\\s\\S]*--screen2-transport-bus-icon-tint: ${SCREEN2_TRANSPORT_ICON_TINTS.light.bus.toLowerCase()}`,
      ),
    );
    expect(css).toMatch(
      new RegExp(
        `\\.slide\\[data-theme="light"\\][\\s\\S]*--screen2-transport-landmark-icon-tint: ${SCREEN2_TRANSPORT_ICON_TINTS.light.landmark.toLowerCase()}`,
      ),
    );

    const tintedBlock = css.match(/\.tintedRasterIcon\s*\{[^}]+\}/)?.[0] ?? "";
    expect(tintedBlock).toContain("mask-image: var(--screen2-icon-mask)");
    expect(tintedBlock).not.toContain("filter:");
    const arrowBlock = css.match(/\.directionArrow\s*\{[^}]+\}/)?.[0] ?? "";
    const lineBadgeBlock = css.match(/\.lineBadge\s*\{[^}]+\}/)?.[0] ?? "";
    expect(arrowBlock).not.toContain("mask-image");
    expect(lineBadgeBlock).not.toContain("mask-image");
  });

  it("preserves icon geometry, compact variants, and decorative semantics", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.titleIconImage[\s\S]*clamp\(44px,\s*3\.2vw,\s*52px\)/);
    expect(css).toMatch(/\.directionLandmark[\s\S]*clamp\(56px,\s*4\.2vw,\s*76px\)/);
    expect(css).toMatch(/\.compact \.titleIconImage[\s\S]*22px/);
    expect(css).toMatch(/\.compact \.directionLandmark[\s\S]*20px/);

    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        compact
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const bus = screen.getByTestId("screen2-transport-bus-icon");
    expect(bus.tagName).toBe("SPAN");
    expect(bus.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render landmark tint elements for tenants without mapping", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="other-club"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.queryByTestId("screen2-transport-direction-landmark-allschwil-zentrum")).toBeNull();
    expect(screen.queryByTestId("screen2-transport-direction-landmark-bachgraben-basel")).toBeNull();
    expect(screen.getByTestId("screen2-transport-bus-icon").className).toMatch(/transportBusIconTint/);
  });
});
