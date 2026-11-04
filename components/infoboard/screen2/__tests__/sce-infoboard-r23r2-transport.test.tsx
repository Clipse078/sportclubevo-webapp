/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R2 — full-height ÖV departure cards and panel ambient layout.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  SCREEN2_TRANSPORT_DIRECTION_ROW_COUNT_VAR,
  SCREEN2_TRANSPORT_FULL_ROW_MIN_HEIGHT_PX,
  SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION,
  SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX,
  SCREEN2_TRANSPORT_SPARSE_ROW_MAX_VAR,
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

function departureAt(minute: number): TransportDeparture {
  return {
    ...BASE_DEPARTURE,
    plannedDeparture: `2026-09-02T18:${String(minute).padStart(2, "0")}:00+0200`,
    realtimeDeparture: `2026-09-02T18:${String(minute).padStart(2, "0")}:00+0200`,
    delayMinutes: null,
    destination: `Basel, Stop ${minute}`,
  };
}

function makeTransport(
  leftCount: number,
  rightCount: number,
): TransportResult {
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
        departures: Array.from({ length: leftCount }, (_, index) => departureAt(40 + index)),
      },
      {
        id: "bachgraben-basel",
        displayName: "Richtung Bachgraben / Basel",
        orientation: "right",
        departures: Array.from({ length: rightCount }, (_, index) => departureAt(50 + index)),
      },
    ],
    fetchedAt: "2026-09-02T16:40:00.000Z",
    isStale: false,
    hasRealtimeData: true,
  };
}

describe("SCE-INFOBOARD-R23R2 Screen 2 ÖV", () => {
  it("declares full-height panel and row distribution contracts", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");

    expect(SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION).toBe(5);
    expect(SCREEN2_TRANSPORT_FULL_ROW_MIN_HEIGHT_PX).toBeGreaterThan(68);
    expect(SCREEN2_TRANSPORT_DIRECTION_ROW_COUNT_VAR).toBe("--screen2-transport-direction-row-count");
    expect(SCREEN2_TRANSPORT_SPARSE_ROW_MAX_VAR).toBe("--screen2-transport-sparse-row-max");
    expect(SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX).toBe(156);

    expect(css).toMatch(/\.directionColumns[\s\S]*flex: 1/);
    expect(css).toMatch(/\.directionColumn[\s\S]*min-height: 0/);
    expect(css).toMatch(/\.directionRows[\s\S]*grid-template-rows:[\s\S]*--screen2-transport-direction-row-count/);
    expect(css).toMatch(/\.directionRows\[data-sparse="true"\]/);
    expect(css).not.toMatch(/\.row[\s\S]*max-height: clamp\(52px/);
  });

  it("distributes five departure cards without placeholder rows", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport(5, 0)}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const leftPanel = screen.getByTestId("screen2-transport-direction-allschwil-zentrum");
    const rowStack = within(leftPanel).getByTestId("screen2-transport-direction-rows");
    expect(rowStack.getAttribute("data-row-count")).toBe("5");
    expect(rowStack.getAttribute("data-sparse")).toBe("false");
    expect(within(leftPanel).getAllByTestId("screen2-transport-row")).toHaveLength(5);
  });

  it("marks four-card panels as non-sparse for even vertical expansion", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport(4, 0)}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const rowStack = within(
      screen.getByTestId("screen2-transport-direction-allschwil-zentrum"),
    ).getByTestId("screen2-transport-direction-rows");
    expect(rowStack.getAttribute("data-row-count")).toBe("4");
    expect(rowStack.getAttribute("data-sparse")).toBe("false");
    expect(within(rowStack).getAllByTestId("screen2-transport-row")).toHaveLength(4);
  });

  it("applies bounded sparse expansion for one to three departures", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/data-sparse="true"[\s\S]*--screen2-transport-sparse-row-max/);

    for (const count of [1, 2, 3] as const) {
      const { unmount } = render(
        <Screen2TransportSlide
          transport={makeTransport(count, 0)}
          timezone="Europe/Zurich"
          nowIso="2026-09-02T16:40:00.000Z"
        />,
      );

      const rowStack = within(
        screen.getByTestId("screen2-transport-direction-allschwil-zentrum"),
      ).getByTestId("screen2-transport-direction-rows");
      expect(rowStack.getAttribute("data-row-count")).toBe(String(count));
      expect(rowStack.getAttribute("data-sparse")).toBe("true");
      expect(within(rowStack).getAllByTestId("screen2-transport-row")).toHaveLength(count);
      unmount();
    }
  });

  it("uses one continuous ambient panel background without per-row artwork", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.directionColumn::before/);
    expect(css).toMatch(/\.directionColumn[\s\S]*radial-gradient/);
    expect(css).not.toMatch(/\.row[\s\S]*background-image:/);
    expect(css).not.toMatch(/url\(/);
  });

  it("increases typography relative to the R23R1 compact row band", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.minutes[\s\S]*clamp\(32px/);
    expect(css).toMatch(/\.absoluteTime[\s\S]*font-variant-numeric: tabular-nums/);
    expect(css).toMatch(/\.compact \.destination[\s\S]*font-size: 13\.5px/);
  });

  it("preserves BusFront icon and outward direction arrows", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport(1, 1)}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-bus-icon")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-left")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-right")).toBeTruthy();
    expect(cssArrowSize()).toMatch(/clamp\(48px,\s*3\.6vw,\s*64px\)/);
  });

  it("removes decorative green imminent dots from departure rows", () => {
    const ts = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.tsx");
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");

    expect(ts).not.toContain("imminentIndicator");
    expect(css).not.toContain(".imminentIndicator");

    render(
      <Screen2TransportSlide
        transport={makeTransport(0, 1)}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.queryByTestId("screen2-transport-imminent-indicator")).toBeNull();
    expect(screen.getByTestId("screen2-transport-wait-time").className).toMatch(/minutes/);
  });

  it("supports LIGHT and DARK theme tokens on the slide root", () => {
    const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
    expect(css).toMatch(/\.slide\[data-theme="light"\][\s\S]*\.directionColumn/);

    const { rerender } = render(
      <Screen2TransportSlide transport={makeTransport(1, 1)} timezone="Europe/Zurich" theme="dark" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("dark");

    rerender(
      <Screen2TransportSlide transport={makeTransport(1, 1)} timezone="Europe/Zurich" theme="light" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");
  });

  it("does not touch Screen 1 presentation assets", () => {
    const screen1Css = readRepoFile("components/infoboard/screen1/InfoboardScreen1.module.css");
    expect(screen1Css).toContain("--ib-kabine-badge-width");
    expect(readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css")).not.toContain(
      "InfoboardScreen1",
    );
  });

  it("preserves transport provider architecture and outer rotation timings", () => {
    const configTs = readRepoFile("lib/transport/transport-config.ts");
    expect(configTs).toMatch(/providerCandidateLimit:\s*50/);

    expect(durationMsForScreen2Presentation("anlageplan")).toBe(25_000);
    expect(durationMsForScreen2Presentation("ov")).toBe(20_000);
    expect(nextScreen2Presentation("anlageplan")).toBe("ov");
    expect(nextScreen2Presentation("ov")).toBe("anlageplan");
  });
});

function cssArrowSize(): string {
  const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");
  const match = css.match(/\n\.directionArrow \{[\s\S]*?width: ([^;]+);/);
  return match?.[1]?.trim() ?? "";
}
