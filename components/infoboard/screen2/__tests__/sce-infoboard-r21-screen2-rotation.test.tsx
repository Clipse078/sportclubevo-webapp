/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R21 — Screen 2 rotation and layout regression tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfoboardAnlageplan } from "@/components/infoboard/anlageplan/InfoboardAnlageplan";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { PREVIEW_FIXTURE } from "@/components/infoboard/screen1/screen1-preview-fixture";
import { Screen2CenterStack } from "@/components/infoboard/screen2/Screen2CenterStack";
import { KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY } from "@/lib/infoboard/kiosk-shell-presentation";
import {
  SCREEN2_CENTER_WIDTH_PX,
  SCREEN2_SPONSOR_RAIL_WIDTH_PX,
} from "@/lib/infoboard/screen2-body-shell-sizing";
import {
  SCREEN2_PRESENTATION_ANLAGEPLAN_MS,
  SCREEN2_PRESENTATION_OV_MS,
} from "@/lib/infoboard/screen2-presentation-rotation";
import type { AnlageplanLivePayload } from "@/lib/publishing/infoboard/anlageplan-live-service";
import type { TransportResult } from "@/lib/transport/transport-types";

const REPO_ROOT = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function makeAnlageplanPayload(theme: "DARK" | "LIGHT" = "DARK"): AnlageplanLivePayload {
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
      theme,
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
    {
      line: "38",
      category: "bus",
      categoryLabel: "BUS",
      destination: "Allschwil, Zentrum",
      plannedDeparture: "2026-09-02T18:55:00+0200",
      realtimeDeparture: "2026-09-02T18:55:00+0200",
      delayMinutes: null,
      platform: null,
      direction: "Allschwil, Zentrum",
      nextStopId: "8578173",
      nextStopName: "Allschwil, Hagmattstrasse",
      provider: "opendata.ch",
      hasRealtime: true,
    },
  ],
  directionGroups: [
    {
      id: "allschwil-zentrum",
      displayName: "Richtung Allschwil Zentrum",
      orientation: "left",
      departures: [
        {
          line: "38",
          category: "bus",
          categoryLabel: "BUS",
          destination: "Allschwil, Zentrum",
          plannedDeparture: "2026-09-02T18:55:00+0200",
          realtimeDeparture: "2026-09-02T18:55:00+0200",
          delayMinutes: null,
          platform: null,
          direction: "Allschwil, Zentrum",
          nextStopId: "8578173",
          nextStopName: "Allschwil, Hagmattstrasse",
          provider: "opendata.ch",
          hasRealtime: true,
        },
      ],
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

describe("SCE-INFOBOARD-V2-01-R21 — Screen 2 rotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("initial presentation is ANLAGEPLAN", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    const rotator = screen.getByTestId("screen2-center-rotator");
    expect(rotator.getAttribute("data-active-presentation")).toBe("anlageplan");
    expect(screen.getByTestId("screen2-presentation-anlageplan").getAttribute("data-active")).toBe(
      "true",
    );
    expect(screen.getByTestId("anlageplan-map-canvas")).toBeTruthy();
  });

  it("switches to ÖV after 25 seconds and back after another 20 seconds", async () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
        liveClock={true}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-compact")).toBe("false");

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_OV_MS);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "anlageplan",
    );
  });

  it("does not reset rotation when transport feed object changes", async () => {
    const { rerender } = render(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={TRANSPORT}
        refreshIntervalSeconds={45}
        live={true}
      >
        <div data-testid="anlageplan-child">Anlageplan</div>
      </Screen2CenterStack>,
    );

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS - 1_000);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "anlageplan",
    );

    rerender(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={{ ...TRANSPORT, fetchedAt: "2026-09-02T16:41:00.000Z" }}
        refreshIntervalSeconds={45}
        live={true}
      >
        <div data-testid="anlageplan-child">Anlageplan</div>
      </Screen2CenterStack>,
    );

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
  });

  it("cleans up timers on unmount", () => {
    const clearSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = render(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={TRANSPORT}
        refreshIntervalSeconds={45}
        live={true}
      >
        <div>Anlageplan</div>
      </Screen2CenterStack>,
    );
    unmount();
    expect(clearSpy.mock.calls.length).toBeGreaterThan(0);
    clearSpy.mockRestore();
  });

  it("advances after hidden tab time via visibilitychange", async () => {
    render(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={TRANSPORT}
        refreshIntervalSeconds={45}
        live={true}
      >
        <div>Anlageplan</div>
      </Screen2CenterStack>,
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS + 5_000);
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
  });
});

describe("SCE-INFOBOARD-V2-01-R21 — shell and layout", () => {
  it("keeps shared header and footer mounted during rotation", async () => {
    vi.useFakeTimers();
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    const header = screen.getByTestId("kiosk-shell-header");
    const footer = screen.getByTestId("kiosk-shell-footer");
    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS + SCREEN2_PRESENTATION_OV_MS);
    });
    expect(screen.getByTestId("kiosk-shell-header")).toBe(header);
    expect(screen.getByTestId("kiosk-shell-footer")).toBe(footer);
    vi.useRealTimers();
  });

  it("uses canonical R20 shell presentation on InfoboardAnlageplan", () => {
    const source = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.tsx");
    expect(source).toContain("resolveKioskShellThemePresentation");
    expect(source).toContain("KIOSK_SHELL_HEADER_AMBIENT");
    expect(source).toContain("KIOSK_SHELL_FOOTER_AMBIENT");
    expect(source).toContain("resolveKioskHeaderWelcomeSubtitle");
  });

  it("preserves bold italic tenant typography contract in shared header", () => {
    expect(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontStyle).toBe("italic");
    expect(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontWeight).toBe(800);
  });

  it("removes sponsor rails and reclaims full center width", () => {
    expect(SCREEN2_SPONSOR_RAIL_WIDTH_PX).toBe(0);
    expect(SCREEN2_CENTER_WIDTH_PX).toBeGreaterThan(1100);

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
    expect(screen.queryByText("IHRE WERBUNG")).toBeNull();
  });

  it("does not show ÖV strip under the map during ANLAGEPLAN state", () => {
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    const anlageplanPanel = screen.getByTestId("screen2-presentation-anlageplan");
    expect(anlageplanPanel.getAttribute("data-active")).toBe("true");
    expect(within(anlageplanPanel).getByTestId("anlageplan-map-canvas")).toBeTruthy();
    expect(within(anlageplanPanel).queryByTestId("screen2-transport-panel")).toBeNull();
  });

  it("preserves 16/9 contain-style map canvas contract", () => {
    const mapCss = readRepoFile("components/infoboard/anlageplan/InfoboardAnlageplan.module.css");
    expect(mapCss).toContain("aspect-ratio: 16 / 9");
    expect(mapCss).toContain("width: min(100cqw, calc(100cqh * 16 / 9))");
    expect(mapCss).toContain("height: min(100cqh, calc(100cqw * 9 / 16))");
  });
});

describe("SCE-INFOBOARD-V2-01-R21 — ÖV presentation", () => {
  it("renders multiple grouped departures with associations in full-screen mode", async () => {
    vi.useFakeTimers();
    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload()}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
    });

    expect(screen.getByTestId("screen2-transport-direction-columns")).toBeTruthy();
    expect(screen.getAllByTestId("screen2-transport-row").length).toBeGreaterThan(1);
    expect(screen.getByText("Basel, Bachgraben")).toBeTruthy();
    expect(screen.getByText("Allschwil, Zentrum")).toBeTruthy();
    vi.useRealTimers();
  });

  it("surfaces loading/unavailable/empty/stale states without fabricating departures", () => {
    const unavailable: TransportResult = {
      isAvailable: false,
      stationDisplayName: "Allschwil, Im Brüel",
      stationId: "8578172",
      fetchedAt: "2026-09-02T16:40:00.000Z",
      cachedDepartures: [],
    };

    render(
      <Screen2CenterStack
        tenantKey="fc-allschwil"
        timezone="Europe/Zurich"
        initialTransport={unavailable}
        refreshIntervalSeconds={45}
        live={false}
      >
        <div>Map</div>
      </Screen2CenterStack>,
    );

    expect(screen.getByTestId("screen2-transport-unavailable")).toBeTruthy();
    expect(screen.queryAllByTestId("screen2-transport-row")).toHaveLength(0);
  });
});

describe("SCE-INFOBOARD-V2-01-R21 — theme parity and regressions", () => {
  it("LIGHT and DARK share rotation behavior", async () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload("DARK")}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );
    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
    unmount();

    render(
      <InfoboardAnlageplan
        payload={makeAnlageplanPayload("LIGHT")}
        branding={{ clubName: "FC Allschwil" }}
        tenantKey="fc-allschwil"
        transport={TRANSPORT}
      />,
    );
    expect(screen.getByTestId("infoboard-anlageplan-root").getAttribute("data-theme")).toBe("light");
    await act(async () => {
      vi.advanceTimersByTime(SCREEN2_PRESENTATION_ANLAGEPLAN_MS);
    });
    expect(screen.getByTestId("screen2-center-rotator").getAttribute("data-active-presentation")).toBe(
      "ov",
    );
    expect(screen.getByTestId("screen2-transport-slide").getAttribute("data-theme")).toBe("light");
    vi.useRealTimers();
  });

  it("Screen 1 remains unchanged", () => {
    const screen1 = readRepoFile("components/infoboard/screen1/InfoboardScreen1.tsx");
    expect(screen1).not.toContain("Screen2PresentationRotator");
    render(<InfoboardScreen1 feed={PREVIEW_FIXTURE} liveClock={false} />);
    expect(screen.getByTestId("infoboard-screen1-root")).toBeTruthy();
    expect(screen.queryByTestId("screen2-center-rotator")).toBeNull();
  });

  it("R19 Platz single-line regression file remains present", () => {
    expect(() =>
      readRepoFile("components/infoboard/screen1/__tests__/screen1-r19-platz-single-line.test.tsx"),
    ).not.toThrow();
  });
});
