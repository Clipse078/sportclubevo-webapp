/**
 * Match-shaped crest resolution — delegates to sce-club-visual-identity.
 */

import {
  CANONICAL_EXTERNAL_TEAM_PROVIDER_MAPPING_SELECT,
  collectProviderClubIdsFromExternalTeams,
  loadCanonicalClubLogoIndex,
  resolveExternalTeamLogoWithCanonicalFallback,
  type ProviderClubIdMappingRow,
} from "@/lib/club-directory/canonical-logo-resolution";
import { resolveExternalClubLogoUrl } from "@/lib/club-directory/logo";
import {
  buildStandingsClubEnrichmentByProviderTeamId,
  type StandingsClubEnrichment,
  type StandingsProviderTeamRow,
} from "@/lib/club-directory/standings-club-enrichment";
import {
  collectExternalProviderTeamRowsFromEvents,
  EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
  resolveSceClubCrestUrl,
  type MatchExternalClubLogoRecord,
  type MatchExternalTeamLogoRecord,
  type SceClubCrestResolutionContext,
} from "@/lib/sporting-data/sce-club-crest-resolution";
import { loadSceClubCrestResolutionContext } from "@/lib/sporting-data/sce-club-visual-identity";

export { CANONICAL_EXTERNAL_TEAM_PROVIDER_MAPPING_SELECT };

export type { MatchExternalClubLogoRecord, MatchExternalTeamLogoRecord };

export type MatchExternalCrestResolutionContext = SceClubCrestResolutionContext;

export const EMPTY_MATCH_EXTERNAL_CREST_RESOLUTION_CONTEXT =
  EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT;

type MatchExternalMappingLike = {
  readonly providerHomeTeamId: number;
  readonly providerAwayTeamId: number;
  readonly providerHomeTeamName: string | null;
  readonly providerAwayTeamName: string | null;
  readonly homeTeam: unknown | null;
  readonly awayTeam: unknown | null;
  readonly homeExternalTeam?: MatchExternalTeamLogoRecord | null;
  readonly awayExternalTeam?: MatchExternalTeamLogoRecord | null;
};

type MatchEventWithMappingLike = {
  readonly matchExternalMapping: MatchExternalMappingLike | null;
};

/**
 * @deprecated Prefer resolveSceClubCrestUrl from sce-club-visual-identity.
 */
export function resolveMatchExternalCrestUrl(input: {
  readonly externalTeam: MatchExternalTeamLogoRecord | null | undefined;
  readonly externalClub: MatchExternalClubLogoRecord | null | undefined;
  readonly providerTeamId: number | null;
  readonly providerTeamName?: string | null;
  readonly context: MatchExternalCrestResolutionContext;
}): string | null {
  return resolveSceClubCrestUrl({
    externalTeam: input.externalTeam,
    externalClub: input.externalClub,
    providerTeamId: input.providerTeamId,
    providerTeamName: input.providerTeamName ?? null,
    context: input.context,
  });
}

export { collectExternalProviderTeamRowsFromEvents };

function logoMapFromStandingsEnrichment(
  enrichment: ReadonlyMap<number, StandingsClubEnrichment>,
): ReadonlyMap<number, string | null> {
  const map = new Map<number, string | null>();
  for (const [providerTeamId, entry] of enrichment) {
    map.set(providerTeamId, entry.logoUrl);
  }
  return map;
}

export async function loadMatchExternalCrestResolutionContext(input: {
  readonly tenantId: string;
  readonly events: readonly MatchEventWithMappingLike[];
}): Promise<MatchExternalCrestResolutionContext> {
  const providerRows = collectExternalProviderTeamRowsFromEvents(input.events);

  const enrichmentByProviderTeamId =
    providerRows.length > 0
      ? await buildStandingsClubEnrichmentByProviderTeamId({
          tenantId: input.tenantId,
          rows: providerRows,
        })
      : new Map<number, StandingsClubEnrichment>();

  return loadSceClubCrestResolutionContext({
    tenantId: input.tenantId,
    events: input.events,
    logoByProviderTeamId: logoMapFromStandingsEnrichment(enrichmentByProviderTeamId),
  });
}

export {
  collectProviderClubIdsFromExternalTeams,
  loadCanonicalClubLogoIndex,
  resolveExternalClubLogoUrl,
  resolveExternalTeamLogoWithCanonicalFallback,
};
