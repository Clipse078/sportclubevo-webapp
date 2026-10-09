/**
 * SCE-COLLAB-01B-R1 — multi-team Zielgruppen structural.teamIds seam.
 */

import { describe, expect, it } from "vitest";
import {
  buildMultiTeamOperationalAudience,
  buildOperationalAudienceForTeamIds,
  dedupeTenantTeamIds,
} from "@/lib/collaboration/shared/operational-audience";

describe("operational audience helpers", () => {
  it("buildMultiTeamOperationalAudience uses structural.teamIds union", () => {
    const spec = buildMultiTeamOperationalAudience(["team-b", "team-a"]);
    expect(spec.composition).toBe("UNION");
    expect(spec.components[0]?.structural?.teamIds).toEqual(["team-a", "team-b"]);
  });

  it("single team label differs from multi-team", () => {
    const one = buildMultiTeamOperationalAudience(["team-1"]);
    const many = buildMultiTeamOperationalAudience(["team-1", "team-2"]);
    expect(one.components[0]?.label).toContain("Team");
    expect(many.components[0]?.label).toContain("Turnier");
  });

  it("buildOperationalAudienceForTeamIds matches multi helper", () => {
    const ids = ["t1", "t2"];
    expect(buildOperationalAudienceForTeamIds(ids)).toEqual(buildMultiTeamOperationalAudience(ids));
  });

  it("dedupeTenantTeamIds trims and sorts", () => {
    expect(dedupeTenantTeamIds([" z ", "a", "a", "", null])).toEqual(["a", "z"]);
  });
});
