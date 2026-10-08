import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { SANDRA_FISCHER_SPIELBETRIEB_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { classifyMatchOperationalPatch } from "@/lib/planning/planning-operational-allocation-authorization";

describe("UAT-PERM-01R4 security negatives (automated)", () => {
  const sandra = [...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys];

  it("Sandra lacks events.manage for domain Match mutations", () => {
    expect(sandra).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(sandra).toContain(PERMISSIONS.EVENTS_VIEW);
    expect(sandra).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
  });

  it("mixed Match patch is not classified as allocation-only", () => {
    expect(
      classifyMatchOperationalPatch({
        pitchCode: "P1",
        opponentName: "FC Rival",
      }),
    ).toBe("includes_non_operational");
  });

  it("allocation-only Match patch stays operational", () => {
    expect(
      classifyMatchOperationalPatch({
        pitchCode: "P1",
        homeDressingRoomCode: "H1",
        awayDressingRoomCode: "A1",
      }),
    ).toBe("operational_allocation_only");
  });
});
