/**
 * Canonical external-club crest resolution for admin match read models
 * (Matchcenter, Team Cockpit season matches). Aligns with
 * resolveMatchParticipantIdentity / public feeds — no network I/O.
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

export { CANONICAL_EXTERNAL_TEAM_PROVIDER_MAPPING_SELECT };

export type MatchExternalTeamLogoRecord = {
  readonly logoUrl: string | null;
  readonly externalClub: { readonly logoUrl: string | null };
  readonly providerMappings?: readonly ProviderClubIdMappingRow[] | null;
};

export type MatchExternalClubLogoRecord = {
  readonly logoUrl: string | null;
};

export type MatchExternalCrestResolutionContext = {
  readonly canonicalLogoByProviderClubId: ReadonlyMap<number, string | null>;
  readonly logoByProviderTeamId: ReadonlyMap<number, string | null>;
};

export const EMPTY_MATCH_EXTERNAL_CREST_RESOLUTION_CONTEXT: MatchExternalCrestResolutionContext =
  {
    canonicalLogoByProviderClubId: new Map(),
    logoByProviderTeamId: new Map(),
  };

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
 * Priority (deterministic):
 * 1. Linked ExternalTeam + canonical Verein fallback chain
 * 2. Guest ExternalClub crest (manual opponent club)
 * 3. Provider-team enrichment (explicit mapping / canonical name match)
 * 4. null — ClubCrest initials fallback
 */
export function resolveMatchExternalCrestUrl(input: {
  readonly externalTeam: MatchExternalTeamLogoRecord | null | undefined;
  readonly externalClub: MatchExternalClubLogoRecord | null | undefined;
  readonly providerTeamId: number | null;
  readonly context: MatchExternalCrestResolutionContext;
}): string | null {
  if (input.externalTeam) {
    const fromExternalTeam = resolveExternalTeamLogoWithCanonicalFallback(
      {
        team: input.externalTeam,
        directClub: input.externalTeam.externalClub,
        providerMappings: input.externalTeam.providerMappings,
      },
      input.context.canonicalLogoByProviderClubId,
    );
    if (fromExternalTeam) {
      return fromExternalTeam;
    }
  }

  if (input.externalClub) {
    const fromClub = resolveExternalClubLogoUrl(input.externalClub);
    if (fromClub) {
      return fromClub;
    }
  }

  const providerTeamId = input.providerTeamId;
  if (providerTeamId !== null && Number.isInteger(providerTeamId)) {
    const enriched = input.context.logoByProviderTeamId.get(providerTeamId);
    if (enriched?.trim()) {
      return enriched.trim();
    }
  }

  return null;
}

export function collectExternalProviderTeamRowsFromEvents(
  events: readonly MatchEventWithMappingLike[],
): StandingsProviderTeamRow[] {
  const rows = new Map<number, string>();

  for (const event of events) {
    const mapping = event.matchExternalMapping;
    if (!mapping) {
      continue;
    }

    if (mapping.homeTeam === null) {
      rows.set(
        mapping.providerHomeTeamId,
        mapping.providerHomeTeamName?.trim() || "Home team",
      );
    }

    if (mapping.awayTeam === null) {
      rows.set(
        mapping.providerAwayTeamId,
        mapping.providerAwayTeamName?.trim() || "Away team",
      );
    }
  }

  return [...rows.entries()].map(([providerTeamId, providerTeamName]) => ({
    providerTeamId,
    providerTeamName,
  }));
}

function collectExternalTeamsFromEvents(
  events: readonly MatchEventWithMappingLike[],
): MatchExternalTeamLogoRecord[] {
  const teams: MatchExternalTeamLogoRecord[] = [];

  for (const event of events) {
    const mapping = event.matchExternalMapping;
    if (!mapping) {
      continue;
    }
    if (mapping.homeExternalTeam) {
      teams.push(mapping.homeExternalTeam);
    }
    if (mapping.awayExternalTeam) {
      teams.push(mapping.awayExternalTeam);
    }
  }

  return teams;
}

function logoMapFromStandingsEnrichment(
  enrichment: ReadonlyMap<number, StandingsClubEnrichment>,
): ReadonlyMap<number, string | null> {
  const map = new Map<number, string | null>();
  for (const [providerTeamId, entry] of enrichment) {
    map.set(providerTeamId, entry.logoUrl);
  }
  return map;
}

/**
 * Batched crest context for a set of match events (one tenant).
 */
export async function loadMatchExternalCrestResolutionContext(input: {
  readonly tenantId: string;
  readonly events: readonly MatchEventWithMappingLike[];
}): Promise<MatchExternalCrestResolutionContext> {
  const providerRows = collectExternalProviderTeamRowsFromEvents(input.events);
  const externalTeams = collectExternalTeamsFromEvents(input.events);

  const [enrichmentByProviderTeamId, canonicalLogoByProviderClubId] =
    await Promise.all([
      providerRows.length > 0
        ? buildStandingsClubEnrichmentByProviderTeamId({
            tenantId: input.tenantId,
            rows: providerRows,
          })
        : Promise.resolve(new Map<number, StandingsClubEnrichment>()),
      loadCanonicalClubLogoIndex(
        input.tenantId,
        collectProviderClubIdsFromExternalTeams(externalTeams),
      ),
    ]);

  return {
    canonicalLogoByProviderClubId,
    logoByProviderTeamId: logoMapFromStandingsEnrichment(enrichmentByProviderTeamId),
  };
}
