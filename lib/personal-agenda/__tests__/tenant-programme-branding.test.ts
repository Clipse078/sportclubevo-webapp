import { describe, expect, it } from "vitest";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { resolveSceMeetingPresentationFromProgramme } from "@/lib/sporting-activity-presentation/canonical/adapters/meeting-programme";
import {
  enrichPersonalProgrammeItemsTenantBranding,
  personalProgrammeMeetingItemMissingTenantBranding,
} from "../tenant-programme-branding";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import { personalDashboardPayloadNeedsPresentationRefresh } from "@/lib/dashboard/read-model/read";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "@/lib/dashboard/read-model/constants";

const BRANDING = { displayName: "FC Allschwil", logoUrl: "https://cdn.example/fca.png" };

function meetingItemWithoutTenantClub(): PersonalProgrammeItem {
  const model = resolveSceMeetingPresentationFromProgramme({
    meetingId: "m-1",
    slug: "vorstand",
    title: "Vorstandssitzung",
    meetingDate: new Date("2026-11-17T18:00:00.000Z"),
  });
  return {
    id: "meeting:m-1",
    sourceType: "MEETING",
    startsAt: new Date(model.schedule.startAt),
    title: model.meetingTitle,
    typeLabel: "Sitzung",
    deepLink: model.route.consumeHref!,
    ariaLabel: "Sitzung",
    canonicalPresentation: model,
  };
}

describe("tenant programme branding enrichment", () => {
  it("detects cached meeting rows missing tenantClub", () => {
    expect(personalProgrammeMeetingItemMissingTenantBranding(meetingItemWithoutTenantClub())).toBe(
      true,
    );
  });

  it("hydrates tenant club on meeting canonical presentation", () => {
    const [enriched] = enrichPersonalProgrammeItemsTenantBranding(
      [meetingItemWithoutTenantClub()],
      BRANDING,
    );
    const model = enriched.canonicalPresentation;
    expect(model?.kind).toBe("MEETING");
    expect(model?.tenantClub?.displayName).toBe("FC Allschwil");
    expect(model?.tenantClub?.logoUrl).toBe("https://cdn.example/fca.png");
  });

  it("flags read-model payloads that need presentation refresh", () => {
    const payload = {
      v: PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION,
      scopeHints: {
        participationNavCapable: true,
        requirementRecipientCapable: false,
        hasLinkedPerson: true,
        hasActiveTenantMembership: true,
      },
      programme: {
        supported: true,
        items: [meetingItemWithoutTenantClub()],
      },
      personalWork: {
        attentionItems: [],
        attentionTotalCount: 0,
        viewAllHref: null,
        operationalSourcesDegraded: false,
        taskCount: 0,
        taskPreview: [],
      },
    };
    expect(personalDashboardPayloadNeedsPresentationRefresh(payload)).toBe(true);
  });

  it("does not overwrite an existing tenant club identity", () => {
    const model = resolveSceMeetingPresentationFromProgramme({
      meetingId: "m-2",
      slug: "ok",
      title: "OK",
      meetingDate: new Date("2026-11-17T18:00:00.000Z"),
      tenantClub: buildClubIdentity({ displayName: "Custom Club", logoUrl: "https://cdn/custom.png" }),
    });
    const item: PersonalProgrammeItem = {
      id: "meeting:m-2",
      sourceType: "MEETING",
      startsAt: new Date(),
      title: "OK",
      typeLabel: "Sitzung",
      deepLink: "/x",
      ariaLabel: "Sitzung",
      canonicalPresentation: model,
    };
    const [enriched] = enrichPersonalProgrammeItemsTenantBranding([item], BRANDING);
    expect(enriched.canonicalPresentation?.tenantClub?.displayName).toBe("Custom Club");
  });
});