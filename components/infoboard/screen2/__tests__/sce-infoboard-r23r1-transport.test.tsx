/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R1 — ÖV board composition, icons, and theme parity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
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

function makeTransport(overrides: Partial<Extract<TransportResult, { isAvailable: true }>> = {}): TransportResult {
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
    ...overrides,
  };
}

describe("SCE-INFOBOARD-R23R1 Screen 2 ÖV", () => {
  it("renders premium bus heading icon and tenant-configured direction labels", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-bus-icon")).toBeTruthy();
    expect(screen.getByText("ÖV-ABFAHRTEN")).toBeTruthy();
    expect(screen.getByText("Allschwil, Im Brüel")).toBeTruthy();
    expect(screen.getByText("Richtung Allschwil Zentrum")).toBeTruthy();
    expect(screen.getByText("Richtung Bachgraben / Basel")).toBeTruthy();
  });

  it("places outward direction arrows in heading areas only", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-direction-arrow-left")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-right")).toBeTruthy();
    expect(screen.queryAllByTestId("screen2-transport-row")).toHaveLength(1);
    const row = screen.getByTestId("screen2-transport-row");
    expect(within(row).queryByTestId("screen2-transport-direction-arrow-left")).toBeNull();
    expect(within(row).queryByTestId("screen2-transport-direction-arrow-right")).toBeNull();
  });

  it("uses line-left / countdown-right row hierarchy without full-row green borders", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/grid-template-columns:[\s\S]*minmax\(80px/);
    expect(css).toMatch(/\.countdownColumn[\s\S]*align-items: flex-end/);
    expect(css).not.toMatch(/rowImminent/);

    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const row = screen.getByTestId("screen2-transport-row");
    const badge = within(row).getByTestId("screen2-transport-line-badge");
    const waitTime = within(row).getByTestId("screen2-transport-wait-time");
    expect(badge.compareDocumentPosition(waitTime) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("delegates full-height row distribution to the R23R2 layout contract", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toContain("--screen2-transport-direction-row-count");
    expect(css).toMatch(/\.directionRows[\s\S]*grid-template-rows/);
    expect(css).not.toMatch(/\.row[\s\S]*max-height: clamp\(52px/);
  });

  it("supports LIGHT and DARK theme tokens on the slide root", () => {
    const { rerender } = render(
      <Screen2TransportSlide transport={makeTransport()} timezone="Europe/Zurich" theme="dark" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("dark");

    rerender(
      <Screen2TransportSlide transport={makeTransport()} timezone="Europe/Zurich" theme="light" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");
  });

  it("renders stale, empty, and unavailable states", () => {
    const { rerender } = render(
      <Screen2TransportSlide
        transport={makeTransport({ isStale: true })}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("screen2-transport-stale")).toBeTruthy();

    rerender(
      <Screen2TransportSlide
        transport={{
          isAvailable: true,
          stationDisplayName: "Allschwil, Im Brüel",
          stationId: "8578172",
          departures: [],
          directionGroups: [],
          fetchedAt: "2026-09-02T16:40:00.000Z",
          isStale: false,
          hasRealtimeData: false,
        }}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("screen2-transport-empty")).toBeTruthy();

    rerender(
      <Screen2TransportSlide
        transport={{
          isAvailable: false,
          stationDisplayName: "Allschwil, Im Brüel",
          errorCode: "provider_error",
          fetchedAt: "2026-09-02T16:40:00.000Z",
        }}
        timezone="Europe/Zurich"
      />,
    );
    expect(screen.getByTestId("screen2-transport-unavailable")).toBeTruthy();
  });

  it("does not implement inner pagination hooks", () => {
    const ts = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.tsx");
    expect(ts).not.toMatch(/pagination|rotateSubset|innerTimer/i);
  });

  it("preserves canonical 25s Anlageplan / 20s ÖV outer rotation timings", () => {
    expect(durationMsForScreen2Presentation("anlageplan")).toBe(25_000);
    expect(durationMsForScreen2Presentation("ov")).toBe(20_000);
    expect(nextScreen2Presentation("anlageplan")).toBe("ov");
    expect(nextScreen2Presentation("ov")).toBe("anlageplan");
  });
});
