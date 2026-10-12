import { describe, expect, it } from "vitest";
import {
  EMPTY_MATCH_EXTERNAL_CREST_RESOLUTION_CONTEXT,
  resolveMatchExternalCrestUrl,
} from "../match-external-crest-resolution";

describe("match-external-crest-resolution", () => {
  it("uses canonical Verein logo when direct parent club shell has no crest", () => {
    const canonicalLogo = "https://cdn.example/fc-therwil-verein.png";
    const url = resolveMatchExternalCrestUrl({
      externalTeam: {
        logoUrl: null,
        externalClub: { logoUrl: null },
        providerMappings: [{ providerClubId: 4242 }],
      },
      externalClub: null,
      providerTeamId: 900,
      context: {
        canonicalLogoByProviderClubId: new Map([[4242, canonicalLogo]]),
        logoByProviderTeamId: new Map(),
      },
    });

    expect(url).toBe(canonicalLogo);
  });

  it("falls back to provider-team enrichment when no ExternalTeam is linked", () => {
    const enriched = "https://cdn.example/sc-binningen.png";
    const url = resolveMatchExternalCrestUrl({
      externalTeam: null,
      externalClub: null,
      providerTeamId: 501,
      context: {
        canonicalLogoByProviderClubId: new Map(),
        logoByProviderTeamId: new Map([[501, enriched]]),
      },
    });

    expect(url).toBe(enriched);
  });

  it("prefers linked ExternalTeam crest over provider enrichment", () => {
    const direct = "https://cdn.example/direct-team.png";
    const url = resolveMatchExternalCrestUrl({
      externalTeam: {
        logoUrl: direct,
        externalClub: { logoUrl: null },
        providerMappings: [],
      },
      externalClub: null,
      providerTeamId: 501,
      context: {
        ...EMPTY_MATCH_EXTERNAL_CREST_RESOLUTION_CONTEXT,
        logoByProviderTeamId: new Map([[501, "https://cdn.example/enriched.png"]]),
      },
    });

    expect(url).toBe(direct);
  });

  it("uses guest ExternalClub crest for manual matches", () => {
    const url = resolveMatchExternalCrestUrl({
      externalTeam: null,
      externalClub: { logoUrl: "/guest-club.svg" },
      providerTeamId: null,
      context: EMPTY_MATCH_EXTERNAL_CREST_RESOLUTION_CONTEXT,
    });

    expect(url).toBe("/guest-club.svg");
  });
});
