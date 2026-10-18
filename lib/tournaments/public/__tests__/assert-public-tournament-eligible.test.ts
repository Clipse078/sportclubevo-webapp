import { describe, expect, it } from "vitest";
import { assertPublicTournamentEligible } from "../assert-public-tournament-eligible";

const baseEvent = {
  id: "t1",
  tenantId: "tenant-a",
  type: "TOURNAMENT",
  status: "SCHEDULED",
  reviewStage: "APPROVED",
  websiteVisible: true,
  infoboardVisible: false,
  trainingsplanVisible: false,
  wochenplanVisible: true,
  homepageVisible: false,
  teamPageVisible: false,
  homeAway: "HOME",
};

describe("assertPublicTournamentEligible", () => {
  it("allows website-visible approved tournaments", () => {
    expect(
      assertPublicTournamentEligible({ tenantId: "tenant-a", event: baseEvent }),
    ).toEqual({ eligible: true });
  });

  it("fail-closed when websiteVisible is false", () => {
    const result = assertPublicTournamentEligible({
      tenantId: "tenant-a",
      event: { ...baseEvent, websiteVisible: false },
    });
    expect(result.eligible).toBe(false);
    if (!result.eligible) expect(result.httpStatus).toBe(404);
  });

  it("fail-closed on cross-tenant access", () => {
    const result = assertPublicTournamentEligible({
      tenantId: "tenant-b",
      event: baseEvent,
    });
    expect(result.eligible).toBe(false);
  });

  it("fail-closed when review stage is draft", () => {
    const result = assertPublicTournamentEligible({
      tenantId: "tenant-a",
      event: { ...baseEvent, reviewStage: "DRAFT" },
    });
    expect(result.eligible).toBe(false);
  });
});
