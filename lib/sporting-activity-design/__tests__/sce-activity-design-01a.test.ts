import { describe, expect, it } from "vitest";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import {
  buildClubIdentity,
  buildClubIdentityFromMatchSide,
  buildMatchClubIdentityPair,
  buildNameOnlyClubIdentity,
  buildTournamentOrganiserClubIdentity,
  deriveClubIdentityFallbackLabel,
  mapSportingActivityDensityToPresentationDensity,
  resolveSportingActivityColorToken,
  sportingActivityColorClassName,
} from "@/lib/sporting-activity-design";

function side(partial: Partial<MatchcenterSide> & Pick<MatchcenterSide, "displayName">): MatchcenterSide {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    resolution: "RESOLVED",
    isOwnTeam: false,
    externalLogoUrl: null,
    ...partial,
  };
}

describe("SCE-ACTIVITY-DESIGN-01A — club identity", () => {
  it("resolves internal club with tenant logo", () => {
    const identity = buildClubIdentityFromMatchSide(
      side({
        displayName: "FC Allschwil",
        isOwnTeam: true,
        canonicalTeamName: "FC Allschwil",
        canonicalTeamShortName: "FCA",
      }),
      "https://cdn.example.com/fca.png",
    );
    expect(identity.logoUrl).toBe("https://cdn.example.com/fca.png");
    expect(identity.displayName).toBe("FCA");
    expect(identity.fallbackIdentity.label).toBe("FCA");
  });

  it("resolves external opponent with directory crest", () => {
    const identity = buildClubIdentityFromMatchSide(
      side({
        displayName: "FC Binningen",
        externalLogoUrl: "https://cdn.example.com/binningen.png",
        canonicalExternalTeamName: "FC Binningen",
      }),
      null,
    );
    expect(identity.logoUrl).toBe("https://cdn.example.com/binningen.png");
  });

  it("supports name-only opponent without fabrication", () => {
    const identity = buildNameOnlyClubIdentity("BSC Old Boys");
    expect(identity.logoUrl).toBeNull();
    expect(identity.displayName).toBe("BSC Old Boys");
    expect(identity.fallbackIdentity.kind).toBe("initials");
    expect(identity.fallbackIdentity.label).toBe("BOB");
  });

  it("supports name-only tournament organiser", () => {
    const identity = buildTournamentOrganiserClubIdentity({
      organizerName: "FC Arisdorf",
      organizerLogoUrl: null,
      title: "PlayMore Turnier",
      organizerExternalClubId: null,
    });
    expect(identity.displayName).toBe("FC Arisdorf");
    expect(identity.logoUrl).toBeNull();
  });

  it("degrades gracefully for missing logo with initials fallback label", () => {
    const identity = buildClubIdentity({
      displayName: "FC Lausen 72",
      logoUrl: null,
    });
    expect(identity.logoUrl).toBeNull();
    expect(deriveClubIdentityFallbackLabel(identity.displayName)).toBe("FL7");
  });

  it("handles long club names for fallback initials", () => {
    const label = deriveClubIdentityFallbackLabel("FC Diegten Eptingen");
    expect(label.length).toBeGreaterThan(0);
    expect(label.length).toBeLessThanOrEqual(3);
  });
});

describe("SCE-ACTIVITY-DESIGN-01A — match identity", () => {
  const tenantLogo = "https://cdn.example.com/fca.png";

  function match(home: MatchcenterSide, away: MatchcenterSide): Pick<MatchcenterMatchSummary, "home" | "away"> {
    return { home, away };
  }

  it("HOME FCA: home left, away right", () => {
    const pair = buildMatchClubIdentityPair(
      match(
        side({
          displayName: "FC Allschwil",
          isOwnTeam: true,
          canonicalTeamShortName: "FCA",
        }),
        side({
          displayName: "FC Binningen",
          canonicalExternalTeamShortName: "BIN",
          externalLogoUrl: "https://cdn.example.com/bin.png",
        }),
      ),
      tenantLogo,
    );
    expect(pair.homeClubIdentity.displayName).toBe("FCA");
    expect(pair.homeClubIdentity.logoUrl).toBe(tenantLogo);
    expect(pair.awayClubIdentity.displayName).toBe("BIN");
    expect(pair.awayClubIdentity.logoUrl).toContain("bin.png");
  });

  it("AWAY FCA: ordering unchanged (tenant on away side)", () => {
    const pair = buildMatchClubIdentityPair(
      match(
        side({
          displayName: "BSC Old Boys",
          canonicalExternalTeamName: "BSC Old Boys",
          externalLogoUrl: "https://cdn.example.com/ob.png",
        }),
        side({
          displayName: "FC Allschwil",
          isOwnTeam: true,
          canonicalTeamShortName: "FCA",
        }),
      ),
      tenantLogo,
    );
    expect(pair.homeClubIdentity.displayName).toBe("BSC Old Boys");
    expect(pair.awayClubIdentity.displayName).toBe("FCA");
    expect(pair.awayClubIdentity.logoUrl).toBe(tenantLogo);
  });

  it("resolves crest identities independently per side", () => {
    const pair = buildMatchClubIdentityPair(
      match(
        side({ displayName: "Home", externalLogoUrl: "https://cdn.example.com/h.png" }),
        side({ displayName: "Away", externalLogoUrl: "https://cdn.example.com/a.png" }),
      ),
      null,
    );
    expect(pair.homeClubIdentity.logoUrl).toBe("https://cdn.example.com/h.png");
    expect(pair.awayClubIdentity.logoUrl).toBe("https://cdn.example.com/a.png");
  });
});

describe("SCE-ACTIVITY-DESIGN-01A — tournament organiser", () => {
  it("uses organiser crest when available", () => {
    const identity = buildTournamentOrganiserClubIdentity({
      organizerName: "FC Arisdorf",
      organizerLogoUrl: "https://cdn.example.com/arisdorf.png",
      title: "PlayMore",
      organizerExternalClubId: "club-arisdorf",
    });
    expect(identity.logoUrl).toBe("https://cdn.example.com/arisdorf.png");
    expect(identity.id).toBe("club-arisdorf");
  });

  it("does not substitute participating team for organiser", () => {
    const identity = buildTournamentOrganiserClubIdentity({
      organizerName: "FC Arisdorf",
      organizerLogoUrl: null,
      title: "PlayMore · Junioren F2",
      organizerExternalClubId: null,
    });
    expect(identity.displayName).toBe("FC Arisdorf");
    expect(identity.logoUrl).toBeNull();
  });
});

describe("SCE-ACTIVITY-DESIGN-01A — density + colors", () => {
  it("maps design densities to presentation formatter", () => {
    expect(mapSportingActivityDensityToPresentationDensity("compact")).toBe("compact");
    expect(mapSportingActivityDensityToPresentationDensity("planner")).toBe("standard");
    expect(mapSportingActivityDensityToPresentationDensity("management")).toBe("standard");
  });

  it("uses canonical semantic colors", () => {
    expect(resolveSportingActivityColorToken("TRAINING")).toBe("training-blue");
    expect(resolveSportingActivityColorToken("MATCH")).toBe("match-red");
    expect(resolveSportingActivityColorToken("TOURNAMENT")).toBe("tournament-orange");
    expect(sportingActivityColorClassName("MATCH")).toContain("--sce-secondary");
  });

  it("shares identities across densities (layout-only contract)", () => {
    const identity = buildNameOnlyClubIdentity("FC Allschwil");
    const compact = { ...identity };
    const planner = { ...identity };
    const management = { ...identity };
    expect(planner).toEqual(compact);
    expect(management).toEqual(compact);
  });
});
