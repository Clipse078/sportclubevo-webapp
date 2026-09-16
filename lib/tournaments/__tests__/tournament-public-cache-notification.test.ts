import { describe, expect, it } from "vitest";
import { PUBLIC_CACHE_DOMAINS } from "@/lib/website/public-cache-tags";
import { resolveTournamentPublicationCacheDomains } from "../tournament-public-cache-notification";

describe("resolveTournamentPublicationCacheDomains", () => {
  it("maps wochenplanVisible to weekplan only", () => {
    expect(resolveTournamentPublicationCacheDomains({ wochenplanVisible: false })).toEqual([
      PUBLIC_CACHE_DOMAINS.WEEKPLAN,
    ]);
  });

  it("maps websiteVisible to tournaments, weekplan, and homepage", () => {
    expect(resolveTournamentPublicationCacheDomains({ websiteVisible: true })).toEqual(
      expect.arrayContaining([
        PUBLIC_CACHE_DOMAINS.TOURNAMENTS,
        PUBLIC_CACHE_DOMAINS.WEEKPLAN,
        PUBLIC_CACHE_DOMAINS.HOMEPAGE,
      ]),
    );
  });

  it("does not notify for infoboard-only changes", () => {
    expect(resolveTournamentPublicationCacheDomains({ infoboardVisible: false })).toEqual([]);
  });

  it("maps teamPageVisible to tournaments", () => {
    expect(resolveTournamentPublicationCacheDomains({ teamPageVisible: false })).toEqual([
      PUBLIC_CACHE_DOMAINS.TOURNAMENTS,
    ]);
  });
});
