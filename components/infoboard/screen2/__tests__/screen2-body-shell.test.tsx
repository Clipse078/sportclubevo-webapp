/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R21 — Screen 2 full-width body shell tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardAnlageplan } from "@/components/infoboard/anlageplan/InfoboardAnlageplan";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { PREVIEW_FIXTURE } from "@/components/infoboard/screen1/screen1-preview-fixture";
import { Screen2BodyShell } from "@/components/infoboard/screen2/Screen2BodyShell";
import type { AnlageplanLivePayload } from "@/lib/publishing/infoboard/anlageplan-live-service";
import {
  SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT,
  SCREEN2_BODY_HEIGHT_PX,
  SCREEN2_BODY_INNER_HEIGHT_PX,
  SCREEN2_CENTER_HEIGHT_PX,
  SCREEN2_CENTER_WIDTH_PX,
  SCREEN2_SPONSOR_RAIL_WIDTH_PX,
  computeAnlageplanMapDimensions,
} from "@/lib/infoboard/screen2-body-shell-sizing";
import {
  KIOSK_LOGICAL_HEIGHT,
  KIOSK_LOGICAL_WIDTH,
} from "@/lib/infoboard/kiosk-viewport";
import type { WeatherResult } from "@/lib/weather/weather-types";

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

const AVAILABLE_WEATHER: WeatherResult = {
  isAvailable: true,
  temperatureC: 18,
  conditionCode: 1,
  conditionLabel: "Sonnig",
  windKmh: 12,
  precipitationProbability: null,
  observedAt: "2026-09-01T10:00:00.000Z",
};

describe("SCE-INFOBOARD-V2-01-R21 — Screen 2 body shell", () => {
  it("A. body shell exposes full-width center content only", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
      />,
    );

    expect(screen.getByTestId("screen2-body-shell")).toBeTruthy();
    expect(screen.getByTestId("screen2-center-content")).toBeTruthy();
    expect(screen.queryByTestId("screen2-sponsor-rail-left")).toBeNull();
    expect(screen.queryByTestId("screen2-sponsor-rail-right")).toBeNull();
  });

  it("B. Anlageplan map canvas remains inside the center zone", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
      />,
    );

    const center = screen.getByTestId("screen2-center-content");
    const canvas = screen.getByTestId("anlageplan-map-canvas");
    const scene = screen.getByTestId("anlageplan-map-scene");

    expect(center.contains(canvas)).toBe(true);
    expect(canvas.contains(scene)).toBe(true);
  });

  it("C. header remains outside the body shell", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
      />,
    );

    const root = screen.getByTestId("infoboard-anlageplan-root");
    const header = screen.getByTestId("kiosk-shell-header");
    const body = screen.getByTestId("screen2-body-shell");

    expect(root.contains(header)).toBe(true);
    expect(root.contains(body)).toBe(true);
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.contains(header)).toBe(false);
  });

  it("D. footer remains outside the body shell", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
      />,
    );

    const root = screen.getByTestId("infoboard-anlageplan-root");
    const footer = screen.getByTestId("kiosk-shell-footer");
    const body = screen.getByTestId("screen2-body-shell");

    expect(root.contains(footer)).toBe(true);
    expect(body.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(body.contains(footer)).toBe(false);
  });

  it("E. logical 1920×1080 contract uses full center width", () => {
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.canvasWidth).toBe(KIOSK_LOGICAL_WIDTH);
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.canvasHeight).toBe(KIOSK_LOGICAL_HEIGHT);
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.bodyHeightPx).toBe(SCREEN2_BODY_HEIGHT_PX);
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.bodyInnerHeightPx).toBe(
      SCREEN2_BODY_INNER_HEIGHT_PX,
    );
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.leftRailWidthPx).toBe(
      SCREEN2_SPONSOR_RAIL_WIDTH_PX,
    );
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.centerWidthPx).toBe(SCREEN2_CENTER_WIDTH_PX);
    expect(SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT.centerHeightPx).toBe(SCREEN2_CENTER_HEIGHT_PX);
    expect(SCREEN2_SPONSOR_RAIL_WIDTH_PX).toBe(0);

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
    expect(mapDimensions.widthPx).toBeLessThanOrEqual(SCREEN2_CENTER_WIDTH_PX);
    expect(mapDimensions.heightPx).toBeLessThanOrEqual(SCREEN2_CENTER_HEIGHT_PX);

    const sizing = readRepoFile("lib/infoboard/screen2-body-shell-sizing.ts");
    expect(sizing).toContain("SCREEN2_BODY_SHELL_MEASUREMENT_CONTRACT");
    expect(sizing).toContain("SCREEN2_SPONSOR_RAIL_WIDTH_PX = 0");
    expect(sizing).toContain("--screen2-body-height");
  });

  it("F. Screen 1 is unaffected by the Screen 2 body shell", () => {
    const screen1 = readRepoFile("components/infoboard/screen1/InfoboardScreen1.tsx");
    expect(screen1).not.toContain("Screen2BodyShell");
    expect(screen1).not.toContain("Screen2SponsorRail");

    render(<InfoboardScreen1 feed={PREVIEW_FIXTURE} liveClock={false} />);

    expect(screen.queryByTestId("screen2-body-shell")).toBeNull();
    expect(screen.getByTestId("infoboard-screen1-root")).toBeTruthy();
  });

  it("G. weather wiring in InfoboardAnlageplan is unchanged", () => {
    const anlageplan = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.tsx");
    expect(anlageplan).toContain("weather={showWeather ? weather : null}");
    expect(anlageplan).not.toMatch(/getCanonicalKioskWeather/);

    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        weather={AVAILABLE_WEATHER}
        shellConfig={{ showWeather: true }}
      />,
    );

    const header = screen.getByTestId("kiosk-shell-header");
    expect(within(header).getByTestId("header-weather")).toBeTruthy();
  });

  it("H. preview and kiosk both render InfoboardAnlageplan with Screen2BodyShell", () => {
    const previewFrame = readRepoFile("components/infoboard/preview/PreviewFrame.tsx");
    const screen2Page = readRepoFile("app/infoboard/screen-2/page.tsx");
    const slugPage = readRepoFile("app/infoboard/[slug]/page.tsx");
    const anlageplan = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.tsx");

    expect(previewFrame).toMatch(
      /PreviewFrameAnlageplan[\s\S]*PhysicalInfoboardViewport[\s\S]*InfoboardAnlageplan/,
    );
    expect(screen2Page).toContain("InfoboardAnlageplan");
    expect(slugPage).toContain("InfoboardAnlageplan");
    expect(anlageplan).toContain("Screen2BodyShell");
  });

  it("I. Screen2BodyShell does not render sponsor placeholder copy", () => {
    render(
      <Screen2BodyShell center={<div data-testid="center-slot">CENTER</div>} />,
    );

    expect(screen.getByTestId("center-slot")).toBeTruthy();
    expect(screen.queryByText("IHRE WERBUNG")).toBeNull();
    expect(screen.queryByText("SPONSOR")).toBeNull();
  });

  it("J. body shell fills available body height", () => {
    const shellCss = readRepoFile("components/infoboard/screen2/Screen2BodyShell.module.css");
    const anlageplanCss = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.module.css");

    expect(shellCss).toContain("height: 100%");
    expect(shellCss).toContain("container-type: size");
    expect(anlageplanCss).toContain(".mainRegion");
    expect(anlageplanCss).toContain("display: flex");
    expect(anlageplanCss).toContain("flex-direction: column");
  });

  it("Anlageplan outer sizing preserves 16/9 aspect ratio inside center", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
      />,
    );

    const canvas = screen.getByTestId("anlageplan-map-canvas");
    const mapCss = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.module.css");
    expect(mapCss).toContain("aspect-ratio: 16 / 9");
    expect(mapCss).toContain("width: min(100cqw, calc(100cqh * 16 / 9))");
    expect(mapCss).toContain("height: min(100cqh, calc(100cqw * 9 / 16))");
    expect(canvas.className).toContain("mapCanvas");
  });
});
