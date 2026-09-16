/**
 * lib/club-directory/club-directory-client.ts
 *
 * CLUB-DIRECTORY-CONSISTENCY-01 — shared browser/client read contract for
 * GET /api/club-directory/clubs. TournamentCenter, MatchCenter, and
 * /dashboard/vereine must all use this (or the API directly with the same
 * semantics) so pagination/search cannot diverge per module.
 */

import {
  CLUB_DIRECTORY_MAX_LIMIT,
  CLUB_DIRECTORY_DEFAULT_LIMIT,
} from "@/lib/club-directory/query-service";

export { CLUB_DIRECTORY_MAX_LIMIT, CLUB_DIRECTORY_DEFAULT_LIMIT };

export const CLUB_DIRECTORY_SEARCH_MIN_CHARS = 2;

/** Maximum pages walked for a single search (circuit breaker). */
export const CLUB_DIRECTORY_MAX_SEARCH_PAGES = 50;

export type ClubDirectoryClientClub = {
  id: string;
  name: string;
  shortName: string | null;
  alternativeName?: string | null;
  logoUrl: string | null;
  source?: string;
  archivedAt?: string | null;
  teamCount?: number;
  hasProviderMapping?: boolean;
};

export type ClubDirectoryListMeta = {
  total: number;
  limit: number;
  skip: number;
  hasMore: boolean;
};

export type FetchClubDirectoryPageInput = {
  search?: string;
  limit?: number;
  skip?: number;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  signal?: AbortSignal;
};

type ClubsApiResponse = {
  clubs?: ClubDirectoryClientClub[];
  meta?: ClubDirectoryListMeta;
  error?: string;
};

function buildClubsQuery(params: FetchClubDirectoryPageInput): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  qs.set("limit", String(params.limit ?? CLUB_DIRECTORY_DEFAULT_LIMIT));
  qs.set("skip", String(params.skip ?? 0));
  if (params.includeArchived) qs.set("includeArchived", "true");
  if (params.archivedOnly) qs.set("archivedOnly", "true");
  return qs;
}

export async function fetchClubDirectoryClubsPage(
  params: FetchClubDirectoryPageInput,
): Promise<{ clubs: ClubDirectoryClientClub[]; meta: ClubDirectoryListMeta }> {
  const qs = buildClubsQuery(params);
  const res = await fetch(`/api/club-directory/clubs?${qs.toString()}`, {
    cache: "no-store",
    signal: params.signal,
  });
  const data = (await res.json().catch(() => null)) as ClubsApiResponse | null;
  if (!res.ok) {
    throw new Error(data?.error ?? "Vereinsverzeichnis konnte nicht geladen werden.");
  }

  const clubs = Array.isArray(data?.clubs) ? data.clubs : [];
  const limit = params.limit ?? CLUB_DIRECTORY_DEFAULT_LIMIT;
  const skip = params.skip ?? 0;
  const meta: ClubDirectoryListMeta =
    data?.meta ??
    {
      total: clubs.length,
      limit,
      skip,
      // Back-compat when `meta` is omitted: a full page implies more data may exist.
      hasMore: clubs.length >= limit,
    };

  return { clubs, meta };
}

/**
 * Walks every result page for `searchTerm` (same contract as ExternalClubPicker).
 */
export async function fetchAllClubDirectorySearchMatches(
  searchTerm: string,
  options?: { archivedOnly?: boolean; signal?: AbortSignal },
): Promise<ClubDirectoryClientClub[]> {
  const allClubs: ClubDirectoryClientClub[] = [];
  let skip = 0;

  for (let page = 0; page < CLUB_DIRECTORY_MAX_SEARCH_PAGES; page += 1) {
    const { clubs, meta } = await fetchClubDirectoryClubsPage({
      search: searchTerm,
      limit: CLUB_DIRECTORY_MAX_LIMIT,
      skip,
      archivedOnly: options?.archivedOnly,
      signal: options?.signal,
    });
    allClubs.push(...clubs);
    if (!meta.hasMore || clubs.length < CLUB_DIRECTORY_MAX_LIMIT) break;
    skip += CLUB_DIRECTORY_MAX_LIMIT;
  }

  return allClubs;
}
