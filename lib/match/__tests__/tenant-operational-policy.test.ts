import { describe, expect, it } from "vitest";
import { validateTenantMatchDurationMinutes } from "../validation";
import { mapTenantMatchOperationalPolicyRow } from "../tenant-operational-policy-service";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "../defaults";

describe("tenant match operational policy", () => {
  it("maps missing row to platform fallback", () => {
    expect(mapTenantMatchOperationalPolicyRow(null)).toEqual({
      defaultMatchDurationMinutes: SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
      isClubConfigured: false,
    });
  });

  it("validates tenant duration bounds", () => {
    expect(validateTenantMatchDurationMinutes(120)).toBe(120);
    expect(() => validateTenantMatchDurationMinutes(0)).toThrow();
    expect(() => validateTenantMatchDurationMinutes(-1)).toThrow();
    expect(() => validateTenantMatchDurationMinutes(481)).toThrow();
  });
});
