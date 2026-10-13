/**
 * Server-side loaders for SCE club crest resolution.
 * Pure resolution lives in sce-club-crest-resolution.ts.
 */

import { prisma } from "@/lib/db/prisma";
import { SFV_PROVIDER } from "@/lib/integrations/sfv/season-bridge";
import {
  buildCanonicalClubLogoNameIndex,
  collectProviderClubIdsFromExternalTeams,
  loadCanonicalClubLogoIndex,
} from "@/lib/club-directory/canonical-logo-resolution";
import { buildCanonicalClubNameIndexes } from "@/lib/club-directory/canonical-club-resolution";
import { resolveExternalClubLogoUrl } from "@/lib/club-directory/logo";
import { buildStandingsClubEnrichmentByProviderTeamId } from "@/lib/club-directory/standings-club-enrichment";
import {
  collectExternalProviderTeamRowsFromEvents,
  type MatchEventWithMappingLike,
  type MatchExternalTeamLogoRecord,
  type SceClubCrestResolutionContext,
} from "@/lib/sporting-data/sce-club-crest-resolution";

export {
  collectExternalProviderTeamRowsFromEvents,
  EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
  resolveSceClubCrestUrl,
  resolveTenantClubCrestUrl,
  resolveTournamentOrganiserCrestUrlFromDomain,
  type MatchExternalClubLogoRecord,
  type MatchExternalTeamLogoRecord,
  type ResolveSceClubCrestUrlInput,
  type SceClubCrestResolutionContext,
} from "@/lib/sporting-data/sce-club-crest-resolution";

export async function loadTenantOwnCanonicalClubCrestUrl(
  tenantId: string,
): Promise<string | null> {
  const config = await prisma.tenantSfvConfig.findUnique({
    where: { tenantId },
    select: { clubId: true },
  });
  if (!config?.clubId) return null;

  const mapping = await prisma.externalClubProviderMapping.findFirst({
    where: {
      tenantId,
      provider: SFV_PROVIDER,
      providerClubId: config.clubId,
    },
    select: {
      externalClub: { select: { logoUrl: true } },
    },
  });

  return resolveExternalClubLogoUrl(mapping?.externalClub ?? { logoUrl: null });
}

function collectExternalTeamsFromEvents(
  events: readonly MatchEventWithMappingLike[],
): MatchExternalTeamLogoRecord[] {
  const teams: MatchExternalTeamLogoRecord[] = [];
  for (const event of events) {
    const mapping = event.matchExternalMapping;
    if (!mapping) continue;
    if (mapping.homeExternalTeam) teams.push(mapping.homeExternalTeam);
    if (mapping.awayExternalTeam) teams.push(mapping.awayExternalTeam);
  }
  return teams;
}

export async function loadSceClubCrestResolutionContext(input: {
  readonly tenantId: string;
  readonly events: readonly MatchEventWithMappingLike[];
  readonly logoByProviderTeamId?: ReadonlyMap<number, string | null>;
}): Promise<SceClubCrestResolutionContext> {
  const externalTeams = collectExternalTeamsFromEvents(input.events);

  const canonicalClubsPromise = prisma.externalClub.findMany({
    where: { tenantId: input.tenantId, archivedAt: null },
    select: {
      id: true,
      name: true,
      shortName: true,
      alternativeName: true,
      logoUrl: true,
      providerMappings: {
        where: { provider: SFV_PROVIDER },
        select: { providerClubName: true },
      },
    },
  });

  const [canonicalClubs, canonicalLogoByProviderClubId, enrichmentFromStandings] =
    await Promise.all([
      canonicalClubsPromise,
      loadCanonicalClubLogoIndex(
        input.tenantId,
        collectProviderClubIdsFromExternalTeams(externalTeams),
      ),
      input.logoByProviderTeamId
        ? Promise.resolve(input.logoByProviderTeamId)
        : buildStandingsClubEnrichmentByProviderTeamId({
            tenantId: input.tenantId,
            rows: collectExternalProviderTeamRowsFromEvents(input.events),
          }).then((map) => {
            const logoMap = new Map<number, string | null>();
            for (const [providerTeamId, entry] of map) {
              logoMap.set(providerTeamId, entry.logoUrl);
            }
            return logoMap;
          }),
    ]);

  const canonicalClubNameIndexes = buildCanonicalClubNameIndexes(canonicalClubs);
  const canonicalLogoByNormalizedClubName = buildCanonicalClubLogoNameIndex(
    canonicalClubs.map((club) => ({
      logoUrl: club.logoUrl,
      names: [
        club.name,
        club.shortName,
        club.alternativeName,
        ...club.providerMappings.map((m) => m.providerClubName),
      ],
    })),
  );

  return {
    canonicalLogoByProviderClubId,
    logoByProviderTeamId: enrichmentFromStandings,
    canonicalClubNameIndexes,
    canonicalLogoByNormalizedClubName,
  };
}
