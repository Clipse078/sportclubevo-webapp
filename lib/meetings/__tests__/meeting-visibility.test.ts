import { describe, expect, it } from "vitest";
import { VisibilityScope } from "@prisma/client";
import {
  countMeetingVisibilityAllowlistRefs,
  validateMeetingRestrictedVisibility,
} from "@/lib/meetings/meeting-visibility";

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
});
