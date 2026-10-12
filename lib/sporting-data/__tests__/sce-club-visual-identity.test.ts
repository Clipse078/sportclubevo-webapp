import { describe, expect, it } from "vitest";
import {
  EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
  resolveSceClubCrestUrl,
  resolveTenantClubCrestUrl,
} from "../sce-club-crest-resolution";
import { buildCanonicalClubNameIndexes } from "@/lib/club-directory/canonical-club-resolution";

const TENANT_CREST = "/images/logos/fc-allschwil.png";
const CONCORDIA_CREST = "https://cdn.example/fc-concordia.png";
const THERWIL_CREST = "https://cdn.example/fc-therwil.png";

describe("sce-club-visual-identity", () => {
  it("tenant crest prefers Tenant.logoUrl over own Verein fallback", () => {
    expect(
      resolveTenantClubCrestUrl({
        tenantLogoUrl: TENANT_CREST,
        ownCanonicalClubLogoUrl: CONCORDIA_CREST,
      }),
    ).toBe(TENANT_CREST);
  });

  it("tenant crest falls back to own canonical Verein when Tenant.logoUrl is empty", () => {
    expect(
      resolveTenantClubCrestUrl({
        tenantLogoUrl: null,
        ownCanonicalClubLogoUrl: TENANT_CREST,
      }),
    ).toBe(TENANT_CREST);
  });

  it("internal tenant team shape: canonicalTeamId uses tenant crest at presentation boundary", () => {
    const tenantCrest = resolveTenantClubCrestUrl({
      tenantLogoUrl: TENANT_CREST,
      ownCanonicalClubLogoUrl: null,
    });
    expect(tenantCrest).toBe(TENANT_CREST);
  });

  it("external opponent resolves direct ExternalClub.logoUrl", () => {
    const url = resolveSceClubCrestUrl({
      externalTeam: {
        logoUrl: null,
        externalClub: { logoUrl: CONCORDIA_CREST },
        providerMappings: [{ providerClubId: 3112 }],
      },
      externalClub: null,
      providerTeamId: 50287,
      providerTeamName: "FC Concordia Basel",
      context: EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
    });
    expect(url).toBe(CONCORDIA_CREST);
  });

  it("provider team label resolves canonical Verein crest when explicit mapping row has no logo", () => {
    const indexes = buildCanonicalClubNameIndexes([
      {
        id: "club-therwil",
        name: "FC Therwil",
        shortName: null,
        alternativeName: null,
        logoUrl: THERWIL_CREST,
        providerMappings: [],
      },
    ]);

    const url = resolveSceClubCrestUrl({
      externalTeam: null,
      externalClub: null,
      providerTeamId: 77676,
      providerTeamName: "FC Therwil FF-17",
      context: {
        ...EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
        canonicalClubNameIndexes: indexes,
        logoByProviderTeamId: new Map([[77676, null]]),
      },
    });

    expect(url).toBe(THERWIL_CREST);
  });

  it("mapped providerClubId resolves canonical Verein ahead of shell club imagery", () => {
    const url = resolveSceClubCrestUrl({
      externalTeam: {
        logoUrl: null,
        externalClub: { logoUrl: "https://cdn.example/stale-shell.png" },
        providerMappings: [{ providerClubId: 3109 }],
      },
      externalClub: null,
      providerTeamId: 31645,
      providerTeamName: "FC Black Stars D1",
      context: {
        ...EMPTY_SCE_CLUB_CREST_RESOLUTION_CONTEXT,
        canonicalLogoByProviderClubId: new Map([[3109, CONCORDIA_CREST]]),
      },
    });

    expect(url).toBe(CONCORDIA_CREST);
  });
});
