/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R5 — approved ÖV direction landmark integration.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS,
} from "@/lib/infoboard/screen2-direction-landmarks";
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
    departures: [],
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

describe("SCE-INFOBOARD-R23R5 direction landmarks", () => {
  it("renders FC Allschwil approved landmark PNGs on the correct direction headings", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
      />,
    );

    const leftLandmark = screen.getByTestId("screen2-transport-direction-landmark-allschwil-zentrum");
    const rightLandmark = screen.getByTestId("screen2-transport-direction-landmark-bachgraben-basel");

    expect(leftLandmark.getAttribute("data-asset-src")).toBe(
      INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.allschwilDorf,
    );
    expect(rightLandmark.getAttribute("data-asset-src")).toBe(
      INFOBOARD_DIRECTION_LANDMARK_ASSET_PATHS.basel,
    );
  });

  it("orders left heading as arrow, landmark, label and right as label, landmark, arrow", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
      />,
    );

    const leftHeading = screen.getByTestId("screen2-transport-direction-heading-allschwil-zentrum");
    const rightHeading = screen.getByTestId("screen2-transport-direction-heading-bachgraben-basel");

    const leftChildTestIds = Array.from(leftHeading.children).map(
      (node) => node.getAttribute("data-testid") ?? node.className,
    );
    expect(leftChildTestIds[0]).toBe("screen2-transport-direction-arrow-left");
    expect(leftChildTestIds[1]).toBe("screen2-transport-direction-landmark-allschwil-zentrum");
    expect(leftChildTestIds[2]).toContain("directionLabel");

    const rightChildTestIds = Array.from(rightHeading.children).map(
      (node) => node.getAttribute("data-testid") ?? node.className,
    );
    expect(rightChildTestIds[0]).toContain("directionLabel");
    expect(rightChildTestIds[1]).toBe("screen2-transport-direction-landmark-bachgraben-basel");
    expect(rightChildTestIds[2]).toBe("screen2-transport-direction-arrow-right");
  });

  it("falls back to arrow-only headings for tenants without landmark mapping", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="other-club"
      />,
    );

    expect(screen.queryByTestId("screen2-transport-direction-landmark-allschwil-zentrum")).toBeNull();
    expect(screen.queryByTestId("screen2-transport-direction-landmark-bachgraben-basel")).toBeNull();
    expect(screen.getByTestId("screen2-transport-direction-arrow-left")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-right")).toBeTruthy();
  });

  it("preserves five-departure layout contract and outer rotation invariants", () => {
    expect(SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION).toBe(5);
    expect(SCREEN2_PRESENTATION_ANLAGEPLAN_MS).toBe(25_000);
    expect(SCREEN2_PRESENTATION_OV_MS).toBe(20_000);

    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.directionRows[\s\S]*grid-template-rows:[\s\S]*--screen2-transport-direction-row-count/);
  });

  it("uses mask-size contain and no landmark background fill on geometry class", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    const tintedBlock = css.match(/\.tintedRasterIcon\s*\{[^}]+\}/)?.[0] ?? "";
    const landmarkBlock = css.match(/\.directionLandmark\s*\{[^}]+\}/)?.[0] ?? "";
    expect(tintedBlock).toContain("mask-size: contain");
    expect(landmarkBlock).not.toContain("background");
  });

  it("preserves LIGHT/DARK theme data contracts on the slide shell", () => {
    const { rerender } = render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        theme="dark"
      />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("dark");

    rerender(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
        theme="light"
      />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");

    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toContain('.slide[data-theme="light"] .directionArrow');
    expect(css).toContain('.slide[data-theme="light"] .directionLabel');
  });

  it("passes tenantKey from Screen2CenterStack into Screen2TransportSlide", () => {
    const source = readRepoFile("components/infoboard/screen2/Screen2CenterStack.tsx");
    expect(source).toMatch(/tenantKey=\{tenantKey\}/);
  });

  it("keeps landmark images out of departure rows", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        tenantKey="fc-allschwil"
      />,
    );
    const row = screen.getAllByTestId("screen2-transport-row")[0];
    expect(within(row).queryByTestId("screen2-transport-direction-landmark-allschwil-zentrum")).toBeNull();
    expect(within(row).queryByTestId("screen2-transport-direction-landmark-bachgraben-basel")).toBeNull();
  });
});
