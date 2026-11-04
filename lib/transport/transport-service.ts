/**
 * lib/transport/transport-service.ts
 *
 * Provider-neutral transport orchestration for Infoboard Screen 2.
 */

import { resolveTenantTransportConfig, type TransportStopConfig } from "./transport-config";
import {
  classifyDeparturesIntoDirectionGroups,
  flattenDirectionGroupDepartures,
} from "./transport-direction-groups";
import { fetchOpendataChStationboard } from "./providers/opendata-ch-transport-provider";
import type { TransportDeparture, TransportResult, TransportUnavailableResult } from "./transport-types";

type TransportCacheEntry = {
  result: TransportResult;
};

const inMemoryTransportCache = new Map<string, TransportCacheEntry>();

function cacheKeyForConfig(config: TransportStopConfig): string {
  return `${config.provider}:${config.stopId}`;
}

function readCachedEntry(config: TransportStopConfig): TransportCacheEntry | undefined {
  return inMemoryTransportCache.get(cacheKeyForConfig(config));
}

function readCachedCandidatePool(
  config: TransportStopConfig,
): TransportDeparture[] | undefined {
  const cached = readCachedEntry(config);
  if (!cached) {
    return undefined;
  }

  if (cached.result.isAvailable) {
    return cached.result.candidateDepartures ?? cached.result.departures;
  }

  return cached.result.cachedDepartures;
}

function readCachedDepartures(
  config: TransportStopConfig,
): TransportDeparture[] | undefined {
  const cached = readCachedEntry(config);
  if (!cached) {
    return undefined;
  }

  if (cached.result.isAvailable) {
    return cached.result.departures;
  }

  return cached.result.cachedDepartures;
}

function storeCache(config: TransportStopConfig, result: TransportResult): void {
  inMemoryTransportCache.set(cacheKeyForConfig(config), { result });
}

function unavailableResult(
  config: TransportStopConfig,
  errorCode: TransportUnavailableResult["errorCode"],
  fetchedAt: string,
  cachedDepartures?: TransportDeparture[],
): TransportUnavailableResult {
  return {
    isAvailable: false,
    stationDisplayName: config.stationDisplayName,
    errorCode,
    fetchedAt,
    ...(cachedDepartures && cachedDepartures.length > 0
      ? { cachedDepartures }
      : {}),
  };
}

function enrichWithDirectionGroups(
  config: TransportStopConfig,
  departures: TransportDeparture[],
) {
  return classifyDeparturesIntoDirectionGroups(
    departures,
    config.directionGroups,
    config.departuresPerDirectionGroup,
  );
}

function availableResult(
  config: TransportStopConfig,
  candidateDepartures: TransportDeparture[],
  stationId: string,
  fetchedAt: string,
  isStale: boolean,
  hasRealtimeData: boolean,
): TransportResult {
  const directionGroups = enrichWithDirectionGroups(config, candidateDepartures);
  const displayedDepartures =
    directionGroups.length > 0
      ? flattenDirectionGroupDepartures(directionGroups)
      : candidateDepartures.slice(0, config.departureCount);

  return {
    isAvailable: true,
    stationDisplayName: config.stationDisplayName,
    stationId,
    departures: displayedDepartures,
    directionGroups,
    candidateDepartures,
    fetchedAt,
    isStale,
    hasRealtimeData,
  };
}

export async function fetchTransportForConfig(
  config: TransportStopConfig,
  fetchFn: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<TransportResult> {
  const fetchedAt = now.toISOString();

  if (!config.enabled) {
    return unavailableResult(config, "disabled", fetchedAt);
  }

  if (config.provider !== "opendata.ch") {
    return unavailableResult(config, "not_configured", fetchedAt);
  }

  const providerResult = await fetchOpendataChStationboard(config, fetchFn, now);

  if (!providerResult.ok) {
    const cachedCandidates = readCachedCandidatePool(config);
    if (cachedCandidates && cachedCandidates.length > 0) {
      const staleResult = availableResult(
        config,
        cachedCandidates,
        config.stopId,
        fetchedAt,
        true,
        cachedCandidates.some((departure) => departure.hasRealtime),
      );
      storeCache(config, staleResult);
      return staleResult;
    }

    const unavailable = unavailableResult(
      config,
      providerResult.errorCode,
      fetchedAt,
      readCachedDepartures(config),
    );
    storeCache(config, unavailable);
    return unavailable;
  }

  const result = availableResult(
    config,
    providerResult.departures,
    providerResult.stationId,
    fetchedAt,
    false,
    providerResult.hasRealtimeData,
  );

  storeCache(config, result);
  return result;
}

export async function fetchTransportForTenant(
  tenantKey: string,
  fetchFn: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<TransportResult | null> {
  const config = resolveTenantTransportConfig(tenantKey);
  if (!config) {
    return null;
  }

  return fetchTransportForConfig(config, fetchFn, now);
}

/** Test helper — clears the in-process fallback cache. */
export function clearTransportServiceCache(): void {
  inMemoryTransportCache.clear();
}
