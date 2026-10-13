/**
 * Pure SCE club crest resolution — no Prisma, safe for client + server.
 */

import {
  buildCanonicalClubNameIndexes,
  resolveCanonicalClubFromProviderTeamName,
  type CanonicalClubNameIndexes,
} from "@/lib/club-directory/canonical-club-resolution";
import { resolveExternalClubLogoUrl, resolveExternalTeamCanonicalLogoUrl } from "@/lib/club-directory/logo";

export type ProviderClubIdMappingRow = {
  readonly providerClubId: number | null;
};

function pickProviderClubId(
  mappings: readonly ProviderClubIdMappingRow[] | null | undefined,
): number | null {
  if (!mappings) return null;
  for (const mapping of mappings) {
    const id = mapping.providerClubId;
    if (id !== null && Number.isInteger(id) && id > 0) {
      return id;
    }
  }
  return null;
}

function resolveExternalTeamLogoWithCanonicalFallback(
  input: {
    readonly team: { readonly logoUrl: string | null | undefined };
    readonly directClub: { readonly logoUrl: string | null | undefined };
    readonly providerMappings?: readonly ProviderClubIdMappingRow[] | null;
  },
  canonicalLogoByProviderClubId: ReadonlyMap<number, string | null>,
): string | null {
  const providerClubId = pickProviderClubId(input.providerMappings);
  const canonicalLogo =
    providerClubId !== null
      ? canonicalLogoByProviderClubId.get(providerClubId) ?? null
      : null;

  return resolveExternalTeamCanonicalLogoUrl(
    input.team,
    input.directClub,
    { logoUrl: canonicalLogo },
  );
}
export type StandingsProviderTeamRow = {
  readonly providerTeamId: number;
  readonly providerTeamName: string;
};

export type MatchExternalTeamLogoRecord = {
  readonly logoUrl: string | null;
  readonly externalClub: { readonly logoUrl: string | null };
  readonly providerMappings?: readonly ProviderClubIdMappingRow[] | null;
};

export type MatchExternalClubLogoRecord = {
  readonly logoUrl: string | null;
};

export type SceClubCrestResolutionContext = {
  readonly canonicalLogoByProviderClubId: ReadonlyMap<number, string | null>;
  readonly logoByProviderTeamId: ReadonlyMap<number, string | null>;
  readonly canonicalClubNameIndexes: CanonicalClubNameIndexes;
  readonly canonicalLogoByNormalizedClubName: ReadonlyMap<string, string | null>;
};

export const EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT: SceClubCrestResolutionContext =
  {
    canonicalLogoByProviderClubId: new Map(),
    logoByProviderTeamId: new Map(),
    canonicalClubNameIndexes: { exactIndex: new Map(), prefixVariants: [] },
    canonicalLogoByNormalizedClubName: new Map(),
  };

export type ResolveSceClubCrestUrlInput = {
  readonly externalTeam: MatchExternalTeamLogoRecord | null | undefined;
  readonly externalClub: MatchExternalClubLogoRecord | null | undefined;
  readonly providerTeamId: number | null;
  readonly providerTeamName: string | null | undefined;
  readonly context: SceClubCrestResolutionContext;
};

export function resolveTenantClubCrestUrl(input: {
  readonly tenantLogoUrl: string | null | undefined;
  readonly ownCanonicalClubLogoUrl?: string | null | undefined;
}): string | null {
  const tenantLogo = input.tenantLogoUrl?.trim();
  if (tenantLogo) return tenantLogo;

  const ownClubLogo = input.ownCanonicalClubLogoUrl?.trim();
  return ownClubLogo || null;
}

/**
 * Tournament organiser crest — domain must pre-resolve via resolveTournamentOrganizerIdentity.
 * Presentation adapters MUST NOT re-apply tenant or HOME heuristics here.
 */
export function resolveTournamentOrganiserCrestUrlFromDomain(
  organizerLogoUrl: string | null | undefined,
): string | null {
  const url = organizerLogoUrl?.trim();
  return url || null;
}

export function resolveSceClubCrestUrl(input: ResolveSceClubCrestUrlInput): string | null {
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

    const providerClubId = pickProviderClubId(
      input.externalTeam.providerMappings as readonly ProviderClubIdMappingRow[] | null,
    );
    if (providerClubId !== null) {
      const fromProviderClub = input.context.canonicalLogoByProviderClubId.get(
        providerClubId,
      );
      if (fromProviderClub?.trim()) {
        return fromProviderClub.trim();
      }
    }
  }

  if (input.externalClub) {
    const fromClub = resolveExternalClubLogoUrl(input.externalClub);
    if (fromClub) return fromClub;
  }

  const providerTeamId = input.providerTeamId;
  if (providerTeamId !== null && Number.isInteger(providerTeamId)) {
    const enriched = input.context.logoByProviderTeamId.get(providerTeamId);
    if (enriched?.trim()) {
      return enriched.trim();
    }
  }

  const providerTeamName = input.providerTeamName?.trim();
  if (providerTeamName) {
    const fromProviderLabel = resolveCanonicalClubFromProviderTeamName(
      providerTeamName,
      input.context.canonicalClubNameIndexes,
    );
    if (fromProviderLabel?.logoUrl?.trim()) {
      return fromProviderLabel.logoUrl.trim();
    }
  }

  return null;
}

export type MatchEventWithMappingLike = {
  readonly matchExternalMapping: {
    readonly providerHomeTeamId: number;
    readonly providerAwayTeamId: number;
    readonly providerHomeTeamName: string | null;
    readonly providerAwayTeamName: string | null;
    readonly homeTeam: unknown | null;
    readonly awayTeam: unknown | null;
    readonly homeExternalTeam?: MatchExternalTeamLogoRecord | null;
    readonly awayExternalTeam?: MatchExternalTeamLogoRecord | null;
  } | null;
};

export function collectExternalProviderTeamRowsFromEvents(
  events: readonly MatchEventWithMappingLike[],
): StandingsProviderTeamRow[] {
  const rows = new Map<number, string>();

  for (const event of events) {
    const mapping = event.matchExternalMapping;
    if (!mapping) continue;

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
