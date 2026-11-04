/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R3 — Screen 2 ÖV typography harmonization with Screen 1.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  SCREEN2_TRANSPORT_ABSOLUTE_TIME_TYPOGRAPHY,
  SCREEN2_TRANSPORT_COUNTDOWN_TYPOGRAPHY,
  SCREEN2_TRANSPORT_DESTINATION_FONT_SIZE,
  SCREEN2_TRANSPORT_DESTINATION_TYPOGRAPHY,
  SCREEN2_TRANSPORT_DIRECTION_LABEL_FONT_SIZE,
  SCREEN2_TRANSPORT_DIRECTION_LABEL_TYPOGRAPHY,
  SCREEN2_TRANSPORT_DISPLAY_FONT,
  SCREEN2_TRANSPORT_EYEBROW_TYPOGRAPHY,
  SCREEN2_TRANSPORT_LINE_BADGE_FONT_SIZE,
  SCREEN2_TRANSPORT_LINE_BADGE_HEIGHT,
  SCREEN2_TRANSPORT_LINE_BADGE_MIN_WIDTH,
  SCREEN2_TRANSPORT_LINE_BADGE_TYPOGRAPHY,
  SCREEN2_TRANSPORT_STATION_TYPOGRAPHY,
} from "@/lib/infoboard/screen2-transport-typography";
import {
  durationMsForScreen2Presentation,
  nextScreen2Presentation,
} from "@/lib/infoboard/screen2-presentation-rotation";
import {
  SCREEN2_TRANSPORT_DIRECTION_ROW_COUNT_VAR,
  SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION,
  SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX,
} from "@/lib/infoboard/screen2-body-shell-sizing";
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

function makeTransport(overrides?: Partial<TransportDeparture>): TransportResult {
  const departure = { ...BASE_DEPARTURE, ...overrides };
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
        departures: [departure],
      },
      {
        id: "bachgraben-basel",
        displayName: "Richtung Bachgraben / Basel",
        orientation: "right",
        departures: [{ ...departure, line: "608", destination: "Basel, Bahnhof SBB" }],
      },
    ],
    fetchedAt: "2026-09-02T16:40:00.000Z",
    isStale: false,
    hasRealtimeData: true,
  };
}

describe("SCE-INFOBOARD-R23R3 Screen 2 ÖV typography", () => {
  const css = readRepoFile("components/infoboard/screen2/Screen2TransportSlide.module.css");

  it("reuses shared Barlow Condensed display tokens for ÖV heading and condensed rows", () => {
    expect(SCREEN2_TRANSPORT_DISPLAY_FONT).toContain("Barlow Condensed");
    expect(SCREEN2_TRANSPORT_EYEBROW_TYPOGRAPHY.fontFamily).toBe(SCREEN2_TRANSPORT_DISPLAY_FONT);
    expect(SCREEN2_TRANSPORT_EYEBROW_TYPOGRAPHY.fontStyle).toBe("normal");
    expect(SCREEN2_TRANSPORT_STATION_TYPOGRAPHY.fontFamily).toBe('var(--font-body)');

    expect(css).toMatch(/\.eyebrow[\s\S]*font-family: var\(--font-display/);
    expect(css).toMatch(/\.eyebrow[\s\S]*font-style: normal/);
    expect(css).toMatch(/\.station[\s\S]*font-family: var\(--font-body\)/);
  });

  it("applies Barlow Condensed bold upright direction headings (~28% vs R23R2)", () => {
    expect(SCREEN2_TRANSPORT_DIRECTION_LABEL_TYPOGRAPHY.fontWeight).toBe(700);
    expect(SCREEN2_TRANSPORT_DIRECTION_LABEL_TYPOGRAPHY.fontStyle).toBe("normal");
    expect(SCREEN2_TRANSPORT_DIRECTION_LABEL_FONT_SIZE).toBe("clamp(23px, 1.6vw, 33px)");

    expect(css).toContain(SCREEN2_TRANSPORT_DIRECTION_LABEL_FONT_SIZE);
    expect(css).toMatch(/\.directionLabel[\s\S]*font-family: var\(--font-display/);
    expect(css).toMatch(/\.directionLabel[\s\S]*font-style: normal/);
    expect(css).not.toMatch(/\.directionLabel[\s\S]*font-style: italic/);
  });

  it("preserves outward direction arrows at R23R2 size", () => {
    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    expect(screen.getByTestId("screen2-transport-direction-arrow-left")).toBeTruthy();
    expect(screen.getByTestId("screen2-transport-direction-arrow-right")).toBeTruthy();
    expect(css).toMatch(/\.directionArrow[\s\S]*clamp\(48px,\s*3\.6vw,\s*64px\)/);

    const leftHeading = screen.getByTestId("screen2-transport-direction-heading-allschwil-zentrum");
    expect(leftHeading.getAttribute("data-orientation")).toBe("left");
    expect(within(leftHeading).getByText("Richtung Allschwil Zentrum")).toBeTruthy();

    const rightHeading = screen.getByTestId("screen2-transport-direction-heading-bachgraben-basel");
    expect(rightHeading.getAttribute("data-orientation")).toBe("right");
    expect(within(rightHeading).getByText("Richtung Bachgraben / Basel")).toBeTruthy();
  });

  it("styles destinations with Barlow Condensed bold upright (~12% vs R23R2)", () => {
    expect(SCREEN2_TRANSPORT_DESTINATION_TYPOGRAPHY.fontStyle).toBe("normal");
    expect(SCREEN2_TRANSPORT_DESTINATION_FONT_SIZE).toBe("clamp(27px, 1.86vw, 38px)");
    expect(css).toContain(SCREEN2_TRANSPORT_DESTINATION_FONT_SIZE);
    expect(css).toMatch(/\.destination[\s\S]*font-family: var\(--font-display/);
    expect(css).toMatch(/\.destination[\s\S]*font-weight: 700/);
    expect(css).toMatch(/\.slide\[data-theme="light"\][\s\S]*\.destination/);
  });

  it("renders long destination names without changing normalization", () => {
    const longName = "Sierentz – Zone Commerciale";
    render(
      <Screen2TransportSlide
        transport={makeTransport({ destination: longName })}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const destination = within(
      screen.getByTestId("screen2-transport-direction-allschwil-zentrum"),
    ).getByText(longName);
    expect(destination.getAttribute("title")).toBe(longName);
    expect(destination.className).toMatch(/destination/);
  });

  it("scales route badges ~10% with three-digit line support", () => {
    expect(SCREEN2_TRANSPORT_LINE_BADGE_TYPOGRAPHY.fontFamily).toBe(SCREEN2_TRANSPORT_DISPLAY_FONT);
    expect(SCREEN2_TRANSPORT_LINE_BADGE_FONT_SIZE).toBe("clamp(29px, 2.04vw, 40px)");
    expect(SCREEN2_TRANSPORT_LINE_BADGE_MIN_WIDTH).toBe("clamp(57px, 3.85vw, 75px)");
    expect(SCREEN2_TRANSPORT_LINE_BADGE_HEIGHT).toBe("clamp(48px, 3.3vw, 64px)");

    expect(css).toContain(SCREEN2_TRANSPORT_LINE_BADGE_FONT_SIZE);
    expect(css).toContain(SCREEN2_TRANSPORT_LINE_BADGE_MIN_WIDTH);
    expect(css).toContain(SCREEN2_TRANSPORT_LINE_BADGE_HEIGHT);

    render(
      <Screen2TransportSlide
        transport={makeTransport()}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const badge = within(
      screen.getByTestId("screen2-transport-direction-bachgraben-basel"),
    ).getByTestId("screen2-transport-line-badge");
    expect(badge.textContent?.trim()).toBe("608");
  });

  it("keeps countdown hierarchy with tabular display numerals", () => {
    expect(SCREEN2_TRANSPORT_COUNTDOWN_TYPOGRAPHY.fontSize).toBe("clamp(32px, 2.35vw, 48px)");
    expect(SCREEN2_TRANSPORT_COUNTDOWN_TYPOGRAPHY.fontVariantNumeric).toBe("tabular-nums");
    expect(SCREEN2_TRANSPORT_ABSOLUTE_TIME_TYPOGRAPHY.fontVariantNumeric).toBe("tabular-nums");

    expect(css).toMatch(/\.minutes[\s\S]*clamp\(32px,\s*2\.35vw,\s*48px\)/);
    expect(css).toMatch(/\.minutes[\s\S]*font-variant-numeric: tabular-nums/);
    expect(css).toMatch(/\.absoluteTime[\s\S]*font-variant-numeric: tabular-nums/);
    expect(css).not.toMatch(/\.minutes[\s\S]*font-style: italic/);

    render(
      <Screen2TransportSlide
        transport={makeTransport({
          plannedDeparture: "2026-09-02T16:41:00+0200",
          realtimeDeparture: "2026-09-02T16:41:00+0200",
        })}
        timezone="Europe/Zurich"
        nowIso="2026-09-02T16:40:00.000Z"
      />,
    );

    const waitTime = within(
      screen.getByTestId("screen2-transport-direction-allschwil-zentrum"),
    ).getByTestId("screen2-transport-wait-time");
    expect(waitTime.textContent?.trim()).toBe("Jetzt");
  });

  it("preserves LIGHT/DARK parity and full-height five-row layout contracts", () => {
    expect(SCREEN2_TRANSPORT_FULL_ROWS_PER_DIRECTION).toBe(5);
    expect(SCREEN2_TRANSPORT_DIRECTION_ROW_COUNT_VAR).toBe("--screen2-transport-direction-row-count");
    expect(SCREEN2_TRANSPORT_FULL_SPARSE_ROW_MAX_HEIGHT_PX).toBe(156);
    expect(css).toMatch(/\.directionColumns[\s\S]*flex: 1/);
    expect(css).toMatch(/\.directionRows\[data-sparse="true"\]/);

    const { rerender } = render(
      <Screen2TransportSlide transport={makeTransport()} timezone="Europe/Zurich" theme="dark" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("dark");

    rerender(
      <Screen2TransportSlide transport={makeTransport()} timezone="Europe/Zurich" theme="light" />,
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");
  });

  it("does not modify Screen 1 assets or transport rotation timings", () => {
    const screen1Css = readRepoFile("components/infoboard/screen1/InfoboardScreen1.module.css");
    const screen1Ts = readRepoFile("components/infoboard/screen1/InfoboardScreen1.tsx");
    expect(screen1Css).toContain("--ib-kabine-badge-width");
    expect(screen1Ts).not.toContain("screen2-transport-typography");

    const configTs = readRepoFile("lib/transport/transport-config.ts");
    expect(configTs).toMatch(/providerCandidateLimit:\s*50/);
    expect(durationMsForScreen2Presentation("anlageplan")).toBe(25_000);
    expect(durationMsForScreen2Presentation("ov")).toBe(20_000);
    expect(nextScreen2Presentation("anlageplan")).toBe("ov");
    expect(nextScreen2Presentation("ov")).toBe("anlageplan");
  });
});
