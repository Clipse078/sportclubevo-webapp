/**
 * SCE-INFOBOARD-R23 — five-departure ÖV policy tests.
 */

import { describe, expect, it } from "vitest";
import {
  FC_ALLSCHWIL_DIRECTION_GROUPS,
  TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
  TRANSPORT_MAX_DEPARTURES_TOTAL,
  resolveTenantTransportConfig,
} from "@/lib/transport/transport-config";
import {
  classifyDeparturesIntoDirectionGroups,
  deduplicateTransportDepartures,
} from "@/lib/transport/transport-direction-groups";
import type { TransportDeparture } from "@/lib/transport/transport-types";

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

describe("R23 transport departure policy", () => {
  it("exposes canonical five-per-direction and ten-total limits on fc-allschwil config", () => {
    const config = resolveTenantTransportConfig("fc-allschwil");
    expect(config).not.toBeNull();
    expect(config?.departureCount).toBe(TRANSPORT_MAX_DEPARTURES_TOTAL);
    expect(config?.departuresPerDirectionGroup).toBe(TRANSPORT_MAX_DEPARTURES_PER_DIRECTION);
    expect(TRANSPORT_MAX_DEPARTURES_PER_DIRECTION).toBe(5);
    expect(TRANSPORT_MAX_DEPARTURES_TOTAL).toBe(10);
  });

  it("returns up to five chronologically sorted departures per direction", () => {
    const departures = Array.from({ length: 7 }, (_, index) =>
      makeDeparture({
        destination: `Stop ${index}`,
        plannedDeparture: `2026-09-02T18:${40 + index}:00+0200`,
        nextStopName: "Allschwil, Hagmattstrasse",
        nextStopId: "8578173",
      }),
    );

    const groups = classifyDeparturesIntoDirectionGroups(
      departures,
      FC_ALLSCHWIL_DIRECTION_GROUPS,
      5,
    );

    expect(groups[0]?.departures).toHaveLength(5);
    expect(groups[0]?.departures[0]?.plannedDeparture).toBe("2026-09-02T18:40:00+0200");
    expect(groups[0]?.departures[4]?.plannedDeparture).toBe("2026-09-02T18:44:00+0200");
  });

  it("supports fewer than five departures without placeholders", () => {
    const groups = classifyDeparturesIntoDirectionGroups(
      [
        makeDeparture({
          destination: "Basel, Bachgraben",
          plannedDeparture: "2026-09-02T18:52:00+0200",
          nextStopName: "Allschwil, Kreuzstrasse",
          nextStopId: "8578171",
        }),
      ],
      FC_ALLSCHWIL_DIRECTION_GROUPS,
      5,
    );

    expect(groups[0]?.departures).toHaveLength(0);
    expect(groups[1]?.departures).toHaveLength(1);
  });

  it("removes genuine duplicate services before grouping", () => {
    const duplicate = makeDeparture({
      destination: "Allschwil, Friedhof",
      plannedDeparture: "2026-09-02T18:49:00+0200",
    });

    const deduped = deduplicateTransportDepartures([duplicate, { ...duplicate, delayMinutes: 2 }]);
    expect(deduped).toHaveLength(1);

    const groups = classifyDeparturesIntoDirectionGroups(
      [duplicate, { ...duplicate, delayMinutes: 2 }],
      FC_ALLSCHWIL_DIRECTION_GROUPS,
      5,
    );
    expect(groups[0]?.departures).toHaveLength(1);
  });

  it("caps ten departures total when both directions have five", () => {
    const left = Array.from({ length: 5 }, (_, index) =>
      makeDeparture({
        line: String(30 + index),
        destination: `Left ${index}`,
        plannedDeparture: `2026-09-02T18:${40 + index}:00+0200`,
        nextStopName: "Allschwil, Hagmattstrasse",
        nextStopId: "8578173",
      }),
    );
    const right = Array.from({ length: 5 }, (_, index) =>
      makeDeparture({
        line: String(40 + index),
        destination: `Right ${index}`,
        plannedDeparture: `2026-09-02T18:${50 + index}:00+0200`,
        nextStopName: "Allschwil, Kreuzstrasse",
        nextStopId: "8578171",
      }),
    );

    const groups = classifyDeparturesIntoDirectionGroups([...left, ...right], FC_ALLSCHWIL_DIRECTION_GROUPS, 5);
    const total = groups.reduce((sum, group) => sum + group.departures.length, 0);
    expect(total).toBe(10);
  });
});
