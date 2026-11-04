/**
 * lib/transport/transport-config.ts
 *
 * Generic tenant transport configuration for Infoboard Screen 2.
 *
 * V1 uses a code/config foundation — no database migration. Future admin UI
 * can persist equivalent fields on Tenant or Infoboard records.
 */

import type { TransportCategory, TransportDirectionOrientation, TransportProviderId } from "./transport-types";

export type TransportDirectionGroupConfig = {
  id: string;
  displayName: string;
  orientation: TransportDirectionOrientation;
  /** Primary matchers against the provider next-stop name after the departure stop. */
  nextStopMatchers?: string[];
  /** Matchers against the provider next-stop identifier. */
  nextStopIdMatchers?: string[];
  /** Fallback matchers against provider direction/headsign fields. */
  providerDirectionMatchers?: string[];
  /** Last-resort fallback matchers against normalized destination text. */
  destinationMatchers?: string[];
};

/** Maximum departures rendered per configured direction (R23 policy). */
export const TRANSPORT_MAX_DEPARTURES_PER_DIRECTION = 5;

/** Maximum departures rendered across all directions (R23 policy). */
export const TRANSPORT_MAX_DEPARTURES_TOTAL = 10;

/**
 * Multiplier applied when deriving provider candidate limits from per-direction caps.
 * Ensures uneven stationboard ordering can still fill five rows per direction.
 */
export const TRANSPORT_PROVIDER_CANDIDATE_POOL_MULTIPLIER = 5;

export type TransportStopConfig = {
  enabled: boolean;
  provider: TransportProviderId;
  /** Canonical provider stop/station identifier (preferred over free-text lookup). */
  stopId: string;
  /** Provider station name used only for diagnostics/fallback lookup. */
  providerStationName?: string;
  /** Display name shown on the kiosk (may differ from provider spelling). */
  stationDisplayName: string;
  coordinate?: {
    latitude: number;
    longitude: number;
  };
  allowedCategories?: TransportCategory[];
  lineFilters?: string[];
  destinationFilters?: string[];
  /** Max departures shown on flat fallback lists (equals total display cap when grouped). */
  departureCount: number;
  /**
   * Provider stationboard fetch limit — may exceed {@link departureCount} so grouping
   * can select five per direction from a skewed candidate pool.
   */
  providerCandidateLimit?: number;
  /** Max departures shown per configured direction group. */
  departuresPerDirectionGroup?: number;
  directionGroups?: TransportDirectionGroupConfig[];
  /** Server/client refresh interval in seconds. */
  refreshIntervalSeconds: number;
};

/**
 * Physical directions from Allschwil, Im Brüel (8578172) validated via
 * transport.opendata.ch passList next-stop topology (2026-09-02):
 *   - Hagmattstrasse: south/west through Allschwil (Friedhof, Oberwil, Therwil, Basel SBB)
 *   - Kreuzstrasse: north/east towards Bachgraben and Basel city
 */
export const FC_ALLSCHWIL_DIRECTION_GROUPS: TransportDirectionGroupConfig[] = [
  {
    id: "allschwil-zentrum",
    displayName: "Richtung Allschwil Zentrum",
    orientation: "left",
    nextStopMatchers: ["Allschwil, Hagmattstrasse"],
    nextStopIdMatchers: ["8578173"],
  },
  {
    id: "bachgraben-basel",
    displayName: "Richtung Bachgraben / Basel",
    orientation: "right",
    nextStopMatchers: ["Allschwil, Kreuzstrasse"],
    nextStopIdMatchers: ["8578171"],
  },
];

const FC_ALLSCHWIL_TRANSPORT: TransportStopConfig = {
  enabled: true,
  provider: "opendata.ch",
  stopId: "8578172",
  providerStationName: "Allschwil, Im Brühl",
  stationDisplayName: "Allschwil, Im Brüel",
  coordinate: {
    latitude: 47.557551,
    longitude: 7.547436,
  },
  allowedCategories: ["bus", "tram", "train"],
  departureCount: TRANSPORT_MAX_DEPARTURES_TOTAL,
  providerCandidateLimit: 50,
  departuresPerDirectionGroup: TRANSPORT_MAX_DEPARTURES_PER_DIRECTION,
  directionGroups: FC_ALLSCHWIL_DIRECTION_GROUPS,
  refreshIntervalSeconds: 45,
};

const TENANT_TRANSPORT_CONFIG: Readonly<Record<string, TransportStopConfig>> = {
  "fc-allschwil": FC_ALLSCHWIL_TRANSPORT,
};

/**
 * Resolves transport configuration for a tenant key.
 * Returns null when transport is not configured or disabled.
 */
export function resolveTenantTransportConfig(
  tenantKey: string,
): TransportStopConfig | null {
  const config = TENANT_TRANSPORT_CONFIG[tenantKey];
  if (!config || !config.enabled) {
    return null;
  }
  return config;
}

/**
 * Resolves how many raw departures to request from the provider before direction grouping.
 */
export function resolveProviderCandidateLimit(config: TransportStopConfig): number {
  if (
    typeof config.providerCandidateLimit === "number" &&
    config.providerCandidateLimit > 0
  ) {
    return config.providerCandidateLimit;
  }

  const perDirection =
    config.departuresPerDirectionGroup ?? TRANSPORT_MAX_DEPARTURES_PER_DIRECTION;
  const directionCount = Math.max(config.directionGroups?.length ?? 2, 2);

  return Math.max(
    config.departureCount,
    perDirection * directionCount * TRANSPORT_PROVIDER_CANDIDATE_POOL_MULTIPLIER,
  );
}
