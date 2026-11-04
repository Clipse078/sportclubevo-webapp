/**
 * lib/transport/transport-presentation.ts
 *
 * Re-applies departure expiry and direction caps as wall-clock time advances,
 * without requiring a provider refetch.
 */

import type { TransportStopConfig } from "./transport-config";
import {
  classifyDeparturesIntoDirectionGroups,
  flattenDirectionGroupDepartures,
} from "./transport-direction-groups";
import { filterActiveDepartures } from "./transport-effective-departure";
import type { TransportAvailableResult, TransportResult } from "./transport-types";

function rebuildAvailablePresentation(
  result: TransportAvailableResult,
  activeCandidates: ReturnType<typeof filterActiveDepartures>,
  config: TransportStopConfig,
): TransportAvailableResult {
  const directionGroups = classifyDeparturesIntoDirectionGroups(
    activeCandidates,
    config.directionGroups,
    config.departuresPerDirectionGroup,
  );

  const departures =
    directionGroups.length > 0
      ? flattenDirectionGroupDepartures(directionGroups)
      : activeCandidates.slice(0, config.departureCount);

  return {
    ...result,
    departures,
    directionGroups,
  };
}

function filterDisplayedGroupsInPlace(
  result: TransportAvailableResult,
  nowMs: number,
): TransportAvailableResult {
  if (result.directionGroups.length === 0) {
    return {
      ...result,
      departures: filterActiveDepartures(result.departures, nowMs),
    };
  }

  const directionGroups = result.directionGroups.map((group) => ({
    ...group,
    departures: filterActiveDepartures(group.departures, nowMs),
  }));

  return {
    ...result,
    directionGroups,
    departures: flattenDirectionGroupDepartures(directionGroups),
  };
}

/**
 * Applies expiry filtering and optional replenishment from the last candidate pool.
 */
export function applyTransportDepartureLifecycle(
  transport: TransportResult | null | undefined,
  now: Date = new Date(),
  config?: TransportStopConfig | null,
): TransportResult | null | undefined {
  if (!transport) {
    return transport;
  }

  const nowMs = now.getTime();

  if (!transport.isAvailable) {
    const cached = transport.cachedDepartures;
    if (!cached || cached.length === 0) {
      return transport;
    }

    const activeCached = filterActiveDepartures(cached, nowMs);
    if (activeCached.length === cached.length) {
      return transport;
    }

    return {
      ...transport,
      cachedDepartures: activeCached,
    };
  }

  const candidatePool = transport.candidateDepartures ?? transport.departures;
  const activeCandidates = filterActiveDepartures(candidatePool, nowMs);

  if (config?.directionGroups && config.directionGroups.length > 0) {
    return rebuildAvailablePresentation(transport, activeCandidates, config);
  }

  if (transport.directionGroups.length > 0) {
    return filterDisplayedGroupsInPlace(transport, nowMs);
  }

  const departureCap = config?.departureCount ?? transport.departures.length;
  return {
    ...transport,
    departures: activeCandidates.slice(0, departureCap),
    directionGroups: [],
  };
}
