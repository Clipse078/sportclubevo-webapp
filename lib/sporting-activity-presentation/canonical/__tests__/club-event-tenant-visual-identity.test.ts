import { describe, expect, it } from "vitest";
import { buildClubIdentity, buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import type { SceClubEventPresentationModel } from "../types";
import {
  attachSceClubEventTenantClubIdentity,
  resolveSceClubEventPrimaryVisualIdentity,
  sceClubEventPrimaryVisualIdentityHasLogo,
} from "../club-event-visual-identity";

function baseClubEventModel(
  overrides: Partial<SceClubEventPresentationModel> = {},
): SceClubEventPresentationModel {
  return {
    kind: "CLUB_EVENT",
    activityId: "e1",
    resourceKey: "club-event:e1",
    typeLabel: "VERANSTALTUNG",
    eventTitle: "Jassturnier",
    schedule: {
      startAt: "2026-10-05T17:00:00.000Z",
      endAt: "2026-10-06T00:00:00.000Z",
    },
    location: { mode: "UNKNOWN", venueName: "Im Brüel" },
    route: { resourceKey: "club-event:e1", consumeHref: "/e", manageHref: null },
    ...overrides,
  };
}

describe("club-event tenant visual identity (01J-R5.3)", () => {
  it("attachSceClubEventTenantClubIdentity sets tenantClub from tenant crest config", () => {
    const model = attachSceClubEventTenantClubIdentity(baseClubEventModel(), {
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "https://cdn.example/fca.png",
    });
    expect(model.tenantClub?.displayName).toBe("FC Allschwil");
    expect(model.tenantClub?.logoUrl).toBeTruthy();
  });

  it("primary visual identity prefers tenant crest over name-only organiser", () => {
    const model = baseClubEventModel({
      organiser: buildNameOnlyClubIdentity("FC Allschwil"),
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: "https://cdn.example/fca.png",
      }),
      audience: {
        kind: "ORG_UNIT",
        primaryLabel: "Vereinsleitung",
        detailLabel: null,
      },
    });
    expect(sceClubEventPrimaryVisualIdentityHasLogo(model)).toBe(true);
    expect(resolveSceClubEventPrimaryVisualIdentity(model)?.logoUrl).toContain("fca.png");
  });

  it("audience scope does not change crest selection", () => {
    const tenantClub = buildClubIdentity({
      displayName: "FC Allschwil",
      logoUrl: "https://cdn.example/fca.png",
    });
    for (const audience of [
      { kind: "CLUB_WIDE" as const, primaryLabel: "Gesamter Verein", detailLabel: null },
      { kind: "TEAM" as const, primaryLabel: "Junioren F1", detailLabel: null },
      { kind: "ORG_UNIT" as const, primaryLabel: "Vereinsleitung", detailLabel: null },
    ]) {
      const model = baseClubEventModel({ tenantClub, audience });
      expect(resolveSceClubEventPrimaryVisualIdentity(model)).toBe(tenantClub);
    }
  });

  it("falls back to external organiser crest when tenant club is absent", () => {
    const organiser = buildClubIdentity({
      displayName: "Partnerverein",
      logoUrl: "https://cdn.example/partner.png",
    });
    const model = baseClubEventModel({ organiser });
    expect(resolveSceClubEventPrimaryVisualIdentity(model)?.displayName).toBe("Partnerverein");
  });
});
