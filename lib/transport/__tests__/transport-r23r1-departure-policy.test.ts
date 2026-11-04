/**
 * SCE-INFOBOARD-R23R1 — provider pool vs display limits and skewed direction pools.
 */

import { describe, expect, it } from "vitest";
import {
  FC_ALLSCHWIL_DIRECTION_GROUPS,
  TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
  TRANSPORT_MAX_DEPARTURES_TOTAL,
  resolveProviderCandidateLimit,
  resolveTenantTransportConfig,
} from "@/lib/transport/transport-config";
import { classifyDeparturesIntoDirectionGroups } from "@/lib/transport/transport-direction-groups";
import { normalizeOpendataStationboard } from "@/lib/transport/providers/opendata-ch-transport-provider";
import type { TransportStopConfig } from "@/lib/transport/transport-config";
import type { TransportDeparture } from "@/lib/transport/transport-types";

const NOW = new Date("2026-09-02T16:40:00.000Z");

function makeDeparture(
  overrides: Partial<TransportDeparture> & Pick<TransportDeparture, "destination" | "plannedDeparture">,
): TransportDeparture {
  return {
    line: "38",
    category: "bus",
    categoryLabel: "BUS",
    realtimeDeparture: overrides.plannedDeparture,
    delayMinutes: null,
    platform: null,
    direction: overrides.destination,
    nextStopId: "8578173",
    nextStopName: "Allschwil, Hagmattstrasse",
    provider: "opendata.ch",
    hasRealtime: false,
    ...overrides,
  };
}

describe("R23R1 transport departure policy", () => {
  it("separates provider candidate limit from visible display cap on fc-allschwil", () => {
    const config = resolveTenantTransportConfig("fc-allschwil");
    expect(config).not.toBeNull();
    expect(config?.departureCount).toBe(TRANSPORT_MAX_DEPARTURES_TOTAL);
    expect(config?.departuresPerDirectionGroup).toBe(TRANSPORT_MAX_DEPARTURES_PER_DIRECTION);
    expect(resolveProviderCandidateLimit(config!)).toBe(50);
    expect(resolveProviderCandidateLimit(config!)).toBeGreaterThan(TRANSPORT_MAX_DEPARTURES_TOTAL);
  });

  it("selects a fifth service beyond the first ten chronological provider candidates when skewed", () => {
    const leftHeavy = Array.from({ length: 10 }, (_, index) =>
      makeDeparture({
        line: String(30 + index),
        destination: `Allschwil Left ${index}`,
        plannedDeparture: `2026-09-02T18:${40 + index}:00+0200`,
        nextStopName: "Allschwil, Hagmattstrasse",
        nextStopId: "8578173",
      }),
    );

    const fifthRight = makeDeparture({
      line: "48",
      destination: "Basel, Bachgraben Five",
      plannedDeparture: "2026-09-02T18:55:00+0200",
      nextStopName: "Allschwil, Kreuzstrasse",
      nextStopId: "8578171",
    });

    const allCandidates = [...leftHeavy, fifthRight];
    expect(allCandidates.slice(0, 10).every((d) => d.nextStopId === "8578173")).toBe(true);

    const groups = classifyDeparturesIntoDirectionGroups(
      allCandidates,
      FC_ALLSCHWIL_DIRECTION_GROUPS,
      TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
    );

    expect(groups[0]?.departures).toHaveLength(5);
    expect(groups[1]?.departures).toHaveLength(1);
    expect(groups[1]?.departures[0]?.destination).toBe("Basel, Bachgraben Five");
  });

  it("fills five per direction when provider returns enough uneven candidates", () => {
    const left = Array.from({ length: 8 }, (_, index) =>
      makeDeparture({
        line: String(20 + index),
        destination: `Left ${index}`,
        plannedDeparture: `2026-09-02T18:${40 + index}:00+0200`,
        nextStopName: "Allschwil, Hagmattstrasse",
        nextStopId: "8578173",
      }),
    );
    const right = Array.from({ length: 8 }, (_, index) =>
      makeDeparture({
        line: String(40 + index),
        destination: `Right ${index}`,
        plannedDeparture: `2026-09-02T18:${50 + index}:00+0200`,
        nextStopName: "Allschwil, Kreuzstrasse",
        nextStopId: "8578171",
      }),
    );

    const groups = classifyDeparturesIntoDirectionGroups(
      [...left, ...right],
      FC_ALLSCHWIL_DIRECTION_GROUPS,
      5,
    );

    expect(groups[0]?.departures).toHaveLength(5);
    expect(groups[1]?.departures).toHaveLength(5);
    expect(groups.reduce((sum, group) => sum + group.departures.length, 0)).toBe(10);
  });

  it("does not reintroduce a three-result display cap", () => {
    const config = resolveTenantTransportConfig("fc-allschwil");
    expect(config?.departuresPerDirectionGroup).not.toBe(3);
  });

  it("requests more than ten raw entries from the provider normalizer when configured", () => {
    const config: TransportStopConfig = {
      enabled: true,
      provider: "opendata.ch",
      stopId: "8578172",
      stationDisplayName: "Allschwil, Im Brüel",
      departureCount: 10,
      providerCandidateLimit: 50,
      refreshIntervalSeconds: 45,
    };

    const entries = Array.from({ length: 30 }, (_, index) => ({
      category: "B",
      number: String(index),
      to: `Destination ${index}`,
      stop: { departure: `2026-09-02T19:${String(index).padStart(2, "0")}:00+0200`, delay: 0 },
    }));

    const result = normalizeOpendataStationboard(
      { station: { id: "8578172" }, stationboard: entries },
      config,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.departures.length).toBe(30);
  });
});
