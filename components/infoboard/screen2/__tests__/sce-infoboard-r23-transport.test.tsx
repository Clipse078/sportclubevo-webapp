/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23 — premium ÖV composition and rotation preservation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION,
} from "@/lib/infoboard/screen2-body-shell-sizing";
import {
  durationMsForScreen2Presentation,
  nextScreen2Presentation,
} from "@/lib/infoboard/screen2-presentation-rotation";
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
  realtimeDeparture: "2026-09-02T18:51:00+0200",
  delayMinutes: 3,
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

describe("SCE-INFOBOARD-R23 Screen 2 ÖV", () => {
  it("uses premium title band with transport icon and tenant stop", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByText("ÖV-ABFAHRTEN")).toBeTruthy();
    expect(screen.getByText("Allschwil, Im Brüel")).toBeTruthy();
    expect(screen.getByLabelText("Öffentlicher Verkehr")).toBeTruthy();
  });

  it("declares full-height dual direction panels without inner pagination hooks", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    const ts = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.tsx");

    expect(css).toContain(".directionColumn");
    expect(css).toContain("grid-template-rows: repeat(var(--screen2-transport-direction-row-count");
    expect(SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION).toBe(5);
    expect(ts).not.toMatch(/pagination|rotateSubset|innerTimer/i);
  });

  it("prioritizes countdown typography in departure rows", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const waitTime = screen.getByTestId("screen2-transport-wait-time");
    expect(waitTime.className).toMatch(/minutes/);
    expect(readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css")).toMatch(
      /\.countdownColumn[\s\S]*\.minutes/,
    );
  });

  it("supports LIGHT and DARK theme tokens on the slide root", () => {
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

  it("preserves canonical 25s Anlageplan / 20s ÖV outer rotation timings", () => {
    expect(durationMsForScreen2Presentation("anlageplan")).toBe(25_000);
    expect(durationMsForScreen2Presentation("ov")).toBe(20_000);
    expect(nextScreen2Presentation("anlageplan")).toBe("ov");
    expect(nextScreen2Presentation("ov")).toBe("anlageplan");
  });
});
