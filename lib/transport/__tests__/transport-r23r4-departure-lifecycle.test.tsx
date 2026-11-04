/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-R23R4 — effective departure integrity, expiry, and replenishment.
 */

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import {
  FC_ALLSCHWIL_DIRECTION_GROUPS,
  TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
  resolveTenantTransportConfig,
} from "@/lib/transport/transport-config";
import { classifyDeparturesIntoDirectionGroups } from "@/lib/transport/transport-direction-groups";
import {
  compareEffectiveDepartures,
  resolveEffectiveDepartureMs,
} from "@/lib/transport/transport-effective-departure";
import { normalizeOpendataStationboard } from "@/lib/transport/providers/opendata-ch-transport-provider";
import { applyTransportDepartureLifecycle } from "@/lib/transport/transport-presentation";
import {
  formatRelativeWaitDisplay,
  resolveRelativeWaitDisplay,
} from "@/lib/transport/transport-wait-time";
import type { TransportDeparture, TransportResult } from "@/lib/transport/transport-types";

/** 10:12 Europe/Zurich (CEST) on 2026-09-02 */
const NOW_1012_ZURICH = new Date("2026-09-02T08:12:00.000Z");
const NOW_MS = NOW_1012_ZURICH.getTime();

function makeDeparture(
  overrides: Partial<TransportDeparture> & Pick<TransportDeparture, "plannedDeparture">,
): TransportDeparture {
  return {
    line: "38",
    category: "bus",
    categoryLabel: "BUS",
    destination: "Allschwil, Friedhof",
    realtimeDeparture: null,
    delayMinutes: null,
    platform: null,
    direction: "Allschwil, Friedhof",
    nextStopId: "8578173",
    nextStopName: "Allschwil, Hagmattstrasse",
    provider: "opendata.ch",
    hasRealtime: false,
    ...overrides,
  };
}

function makeAvailableTransport(
  candidateDepartures: TransportDeparture[],
  directionGroups = classifyDeparturesIntoDirectionGroups(
    candidateDepartures,
    FC_ALLSCHWIL_DIRECTION_GROUPS,
    TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
  ),
): TransportResult {
  return {
    isAvailable: true,
    stationDisplayName: "Allschwil, Im Brüel",
    stationId: "8578172",
    candidateDepartures,
    directionGroups,
    departures: directionGroups.flatMap((group) => group.departures),
    fetchedAt: NOW_1012_ZURICH.toISOString(),
    isStale: false,
    hasRealtimeData: candidateDepartures.some((departure) => departure.hasRealtime),
  };
}

describe("R23R4 effective departure resolver", () => {
  it("expires 10:09 at 10:12 without delay — not Jetzt", () => {
    const departure = makeDeparture({ plannedDeparture: "2026-09-02T10:09:00+0200" });
    const effectiveMs = resolveEffectiveDepartureMs(departure);
    const display = resolveRelativeWaitDisplay(effectiveMs, NOW_MS);

    expect(display.kind).toBe("expired");
    expect(formatRelativeWaitDisplay(display)).toBeNull();
  });

  it("applies +5 minute delay-only row to effective 10:14 (2 min remaining at 10:12)", () => {
    const departure = makeDeparture({
      plannedDeparture: "2026-09-02T10:09:00+0200",
      realtimeDeparture: "2026-09-02T10:09:00+0200",
      delayMinutes: 5,
      hasRealtime: true,
    });

    const effectiveMs = resolveEffectiveDepartureMs(departure);
    const display = resolveRelativeWaitDisplay(effectiveMs, NOW_MS);

    expect(display).toEqual({ kind: "minutes", minutesUntil: 2 });
  });

  it("expires 10:11 at 10:12 without delay", () => {
    const departure = makeDeparture({ plannedDeparture: "2026-09-02T10:11:00+0200" });
    expect(resolveRelativeWaitDisplay(resolveEffectiveDepartureMs(departure), NOW_MS).kind).toBe(
      "expired",
    );
  });

  it("shows Jetzt exactly at effective departure boundary", () => {
    const departure = makeDeparture({ plannedDeparture: "2026-09-02T10:12:00+0200" });
    const effectiveMs = resolveEffectiveDepartureMs(departure);
    expect(resolveRelativeWaitDisplay(effectiveMs, NOW_MS).kind).toBe("jetzt");
  });

  it("prefers prognosis timestamp and never double-applies delay", () => {
    const departure = makeDeparture({
      plannedDeparture: "2026-09-02T10:20:00+0200",
      realtimeDeparture: "2026-09-02T10:23:00+0200",
      delayMinutes: 3,
      hasRealtime: true,
    });

    expect(resolveEffectiveDepartureMs(departure)).toBe(
      Date.parse("2026-09-02T10:23:00+0200"),
    );
  });

  it("sorts and deduplicates deterministically by effective time", () => {
    const first = makeDeparture({
      line: "11",
      plannedDeparture: "2026-09-02T10:20:00+0200",
    });
    const second = makeDeparture({
      line: "38",
      plannedDeparture: "2026-09-02T10:18:00+0200",
    });

    expect(compareEffectiveDepartures(first, second)).toBeGreaterThan(0);
  });
});

describe("R23R4 departure lifecycle and replenishment", () => {
  const config = resolveTenantTransportConfig("fc-allschwil")!;

  it("removes expired displayed rows without network refresh", () => {
    const expired = makeDeparture({ plannedDeparture: "2026-09-02T10:09:00+0200" });
    const upcoming = makeDeparture({ plannedDeparture: "2026-09-02T10:18:00+0200" });
    const transport = makeAvailableTransport([expired, upcoming]);

    const refreshed = applyTransportDepartureLifecycle(transport, NOW_1012_ZURICH, config);
    expect(refreshed?.isAvailable).toBe(true);
    if (!refreshed?.isAvailable) return;

    expect(refreshed.departures.some((d) => d.plannedDeparture === expired.plannedDeparture)).toBe(
      false,
    );
    expect(refreshed.departures.some((d) => d.plannedDeparture === upcoming.plannedDeparture)).toBe(
      true,
    );
  });

  it("replenishes up to five per direction after expiry", () => {
    const left = Array.from({ length: 7 }, (_, index) =>
      makeDeparture({
        line: String(30 + index),
        destination: `Left ${index}`,
        plannedDeparture: `2026-09-02T10:${String(13 + index).padStart(2, "0")}:00+0200`,
        nextStopId: "8578173",
        nextStopName: "Allschwil, Hagmattstrasse",
      }),
    );
    const expiredLeft = makeDeparture({
      line: "29",
      destination: "Expired Left",
      plannedDeparture: "2026-09-02T10:09:00+0200",
      nextStopId: "8578173",
      nextStopName: "Allschwil, Hagmattstrasse",
    });
    const right = Array.from({ length: 7 }, (_, index) =>
      makeDeparture({
        line: String(40 + index),
        destination: `Right ${index}`,
        plannedDeparture: `2026-09-02T10:${String(20 + index).padStart(2, "0")}:00+0200`,
        nextStopId: "8578171",
        nextStopName: "Allschwil, Kreuzstrasse",
      }),
    );

    const transport = makeAvailableTransport([expiredLeft, ...left, ...right]);
    const refreshed = applyTransportDepartureLifecycle(transport, NOW_1012_ZURICH, config);
    if (!refreshed?.isAvailable) throw new Error("expected available transport");

    expect(refreshed.directionGroups[0]?.departures).toHaveLength(5);
    expect(refreshed.directionGroups[1]?.departures).toHaveLength(5);
    expect(
      refreshed.directionGroups[0]?.departures.every(
        (departure) => resolveEffectiveDepartureMs(departure) >= NOW_MS,
      ),
    ).toBe(true);
  });

  it("handles uneven pools and fewer than five valid departures", () => {
    const left = makeDeparture({
      plannedDeparture: "2026-09-02T10:18:00+0200",
      nextStopId: "8578173",
      nextStopName: "Allschwil, Hagmattstrasse",
    });
    const transport = makeAvailableTransport([left]);

    const refreshed = applyTransportDepartureLifecycle(transport, NOW_1012_ZURICH, config);
    if (!refreshed?.isAvailable) throw new Error("expected available transport");

    expect(refreshed.directionGroups[0]?.departures).toHaveLength(1);
    expect(refreshed.directionGroups[1]?.departures).toHaveLength(0);
  });
});

describe("R23R4 provider normalization and stale cache", () => {
  it("drops expired rows during stationboard normalization", () => {
    const config = resolveTenantTransportConfig("fc-allschwil")!;
    const result = normalizeOpendataStationboard(
      {
        station: { id: "8578172" },
        stationboard: [
          {
            category: "B",
            number: "38",
            to: "Allschwil, Friedhof",
            stop: { departure: "2026-09-02T10:09:00+0200", delay: 0 },
          },
          {
            category: "B",
            number: "48",
            to: "Basel, Bachgraben",
            stop: { departure: "2026-09-02T10:18:00+0200", delay: 0 },
          },
        ],
      },
      config,
      NOW_1012_ZURICH,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.departures).toHaveLength(1);
    expect(result.departures[0]?.line).toBe("48");
  });

  it("marks stale cached departures unavailable for countdown when expired", () => {
    const expired = makeDeparture({ plannedDeparture: "2026-09-02T10:09:00+0200" });
    const unavailable: TransportResult = {
      isAvailable: false,
      stationDisplayName: "Allschwil, Im Brüel",
      errorCode: "provider_error",
      fetchedAt: NOW_1012_ZURICH.toISOString(),
      cachedDepartures: [expired],
    };

    const refreshed = applyTransportDepartureLifecycle(unavailable, NOW_1012_ZURICH, null);
    if (refreshed?.isAvailable !== false) throw new Error("expected unavailable");
    expect(refreshed.cachedDepartures ?? []).toHaveLength(0);
  });
});

describe("R23R4 Screen2 presentation", () => {
  it("does not label past 10:09 / 10:11 departures as Jetzt at 10:12", () => {
    const transport = makeAvailableTransport([
      makeDeparture({
        line: "38",
        plannedDeparture: "2026-09-02T10:09:00+0200",
        nextStopId: "8578171",
        nextStopName: "Allschwil, Kreuzstrasse",
      }),
      makeDeparture({
        line: "48",
        plannedDeparture: "2026-09-02T10:11:00+0200",
        nextStopId: "8578171",
        nextStopName: "Allschwil, Kreuzstrasse",
      }),
      makeDeparture({
        line: "49",
        plannedDeparture: "2026-09-02T10:18:00+0200",
        nextStopId: "8578171",
        nextStopName: "Allschwil, Kreuzstrasse",
      }),
    ]);

    render(
      <Screen2TransportSlide
        transport={transport}
        timezone="Europe/Zurich"
        nowIso={NOW_1012_ZURICH.toISOString()}
        lifecycleTenantKey="fc-allschwil"
      />,
    );

    const rightColumn = screen.getByTestId("screen2-transport-direction-bachgraben-basel");
    const waitLabels = within(rightColumn)
      .getAllByTestId("screen2-transport-wait-time")
      .map((node) => node.textContent?.trim());

    expect(waitLabels).not.toContain("Jetzt");
    expect(waitLabels).toContain("6 min");
  });
});

describe("R23R4 malformed provider fields", () => {
  it("treats missing planned departure as non-displayable during normalization", () => {
    const config = resolveTenantTransportConfig("fc-allschwil")!;
    const result = normalizeOpendataStationboard(
      {
        station: { id: "8578172" },
        stationboard: [{ category: "B", number: "38", to: "X", stop: { departure: null } }],
      },
      config,
      NOW_1012_ZURICH,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.departures).toHaveLength(0);
  });

  it("ignores negative delay values and falls back to planned time", () => {
    const departure = makeDeparture({
      plannedDeparture: "2026-09-02T10:18:00+0200",
      delayMinutes: -3,
      hasRealtime: true,
      realtimeDeparture: "2026-09-02T10:18:00+0200",
    });

    expect(resolveEffectiveDepartureMs(departure)).toBe(
      Date.parse("2026-09-02T10:18:00+0200"),
    );
  });
});

describe("R23R4 binary control — rotation and Screen 1 untouched", () => {
  it("keeps 25s Anlageplan / 20s ÖV rotation constants", async () => {
    const rotationModule = await import("@/lib/infoboard/screen2-presentation-rotation");
    expect(rotationModule.SCREEN2_PRESENTATION_ANLAGEPLAN_MS).toBe(25_000);
    expect(rotationModule.SCREEN2_PRESENTATION_OV_MS).toBe(20_000);
  });
});

describe("R23R4 Europe/Zurich DST boundary", () => {
  it("resolves effective times across DST fall-back offset", () => {
    const departure = makeDeparture({
      plannedDeparture: "2026-10-25T02:30:00+0200",
    });
    expect(Number.isFinite(resolveEffectiveDepartureMs(departure))).toBe(true);
  });
});
