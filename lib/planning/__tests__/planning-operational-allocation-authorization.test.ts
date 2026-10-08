import { describe, expect, it } from "vitest";
import {
  classifyMatchOperationalPatch,
  MATCH_OPERATIONAL_ALLOCATION_PATCH_KEYS,
} from "@/lib/planning/planning-operational-allocation-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { SANDRA_FISCHER_SPIELBETRIEB_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

describe("classifyMatchOperationalPatch", () => {
  it("treats pitch and dressing keys as operational allocation only", () => {
    expect(
      classifyMatchOperationalPatch({
        pitchCode: "KUNSTRASEN_2",
        homeDressingRoomCode: "GR1",
      }),
    ).toBe("operational_allocation_only");
    expect(MATCH_OPERATIONAL_ALLOCATION_PATCH_KEYS).toContain("pitchCode");
  });

  it("flags team or schedule changes as non-operational", () => {
    expect(
      classifyMatchOperationalPatch({
        pitchCode: "KUNSTRASEN_2",
        teamId: "team-1",
      }),
    ).toBe("includes_non_operational");
  });
});

describe("Spielbetrieb Koordinator pilot contract", () => {
  const keys = [...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys];

  it("includes center view and allocation manage without domain manage", () => {
    expect(keys).toContain(PERMISSIONS.TRAININGS_VIEW);
    expect(keys).toContain(PERMISSIONS.EVENTS_VIEW);
    expect(keys).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(keys).not.toContain(PERMISSIONS.TRAININGS_MANAGE);
    expect(keys).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(keys).not.toContain(PERMISSIONS.USERS_IMPERSONATE_TENANT);
    expect(keys).not.toContain(PERMISSIONS.FACILITIES_MANAGE);
  });

  it("exposes Planung centers in navigation", () => {
    const hrefs = getVisibleNavSections(keys).flatMap((s) =>
      s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );
    expect(hrefs).toContain("/dashboard/planner/week");
    expect(hrefs).toContain("/dashboard/training");
    expect(hrefs).toContain("/dashboard/matchcenter");
    expect(hrefs).toContain("/dashboard/tournamentcenter");
  });
});
