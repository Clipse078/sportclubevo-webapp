/**
 * @vitest-environment jsdom
 *
 * CLUB-DIRECTORY-CONSISTENCY-01 — proves shared client search walks pages so
 * a club beyond the first directory page (e.g. VfR Kleinhüningen) is retrievable.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { CLUB_DIRECTORY_MAX_LIMIT } from "../query-service";
import { fetchAllClubDirectorySearchMatches } from "../club-directory-client";

const VFR_ID = "club-vfr-kleinhueningen";

function makeClub(id: string, name: string) {
  return {
    id,
    name,
    shortName: null,
    logoUrl: null,
    teamCount: 0,
    hasProviderMapping: true,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAllClubDirectorySearchMatches", () => {
  it("retrieves a club on page 2 when the first page is full (VfR Kleinhüningen regression fixture)", async () => {
    const page1 = Array.from({ length: CLUB_DIRECTORY_MAX_LIMIT }, (_, i) =>
      makeClub(`club-page1-${i}`, `Alpha Verein ${i}`),
    );
    const vfr = makeClub(VFR_ID, "VfR Kleinhüningen");

    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url, "http://localhost");
      const skip = Number(parsed.searchParams.get("skip") ?? "0");
      const search = parsed.searchParams.get("search") ?? "";

      if (search.toLowerCase() !== "klein") {
        return { ok: true, json: async () => ({ clubs: [], meta: { total: 0, limit: 200, skip: 0, hasMore: false } }) };
      }

      if (skip === 0) {
        return {
          ok: true,
          json: async () => ({
            clubs: page1,
            meta: { total: CLUB_DIRECTORY_MAX_LIMIT + 1, limit: CLUB_DIRECTORY_MAX_LIMIT, skip: 0, hasMore: true },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          clubs: [vfr],
          meta: { total: CLUB_DIRECTORY_MAX_LIMIT + 1, limit: CLUB_DIRECTORY_MAX_LIMIT, skip, hasMore: false },
        }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await fetchAllClubDirectorySearchMatches("Klein");

    expect(results.some((c) => c.id === VFR_ID && c.name === "VfR Kleinhüningen")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
