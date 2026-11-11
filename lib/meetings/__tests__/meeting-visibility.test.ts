import { describe, expect, it } from "vitest";
import { VisibilityScope } from "@prisma/client";
import {
  countMeetingVisibilityAllowlistRefs,
  parseMeetingAllowlistInput,
  validateMeetingRestrictedVisibility,
} from "@/lib/meetings/meeting-visibility";
import { resolveMeetingVisibilityOnUpdate } from "@/lib/meetings/meeting-visibility-payload";

describe("meeting visibility validation", () => {
  it("rejects empty RESTRICTED allowlist", () => {
    const result = validateMeetingRestrictedVisibility(VisibilityScope.RESTRICTED, {});
    expect(result.ok).toBe(false);
  });

  it("accepts RESTRICTED with org unit ref", () => {
    const result = validateMeetingRestrictedVisibility(VisibilityScope.RESTRICTED, {
      visibleOrgUnitRefs: ["ou-1"],
    });
    expect(result.ok).toBe(true);
  });

  it("does not require allowlist for ORGANISATION", () => {
    const result = validateMeetingRestrictedVisibility(VisibilityScope.ORGANISATION, {});
    expect(result.ok).toBe(true);
  });

  it("counts mixed allowlist refs", () => {
    expect(
      countMeetingVisibilityAllowlistRefs({
        visibleOrgUnitRefs: ["a"],
        visibleUserRefs: ["u1", "u2"],
      }),
    ).toBe(3);
  });

  it("parseMeetingAllowlistInput preserves omission, null and narrows arrays", () => {
    expect(parseMeetingAllowlistInput(undefined)).toBeUndefined();
    expect(parseMeetingAllowlistInput(null)).toBeNull();
    expect(parseMeetingAllowlistInput([" ou-1 ", "", 42, "role-a"])).toEqual(["ou-1", "role-a"]);
    expect(parseMeetingAllowlistInput("not-an-array")).toEqual([]);
  });

  it("resolveMeetingVisibilityOnUpdate accepts unknown allowlist values", async () => {
    const result = await resolveMeetingVisibilityOnUpdate(
      { visibleOrgUnitRefs: ["ou-1", 123, ""] },
      VisibilityScope.RESTRICTED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.allowlists?.visibleOrgUnitRefs).toEqual(["ou-1"]);
    }
  });
});
