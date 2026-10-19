import { describe, expect, it } from "vitest";
import {
  normalizeJuniorCategoryCode,
  resolveAuthoritativeTeamJuniorCategoryCode,
  resolveStructuredJuniorCategoryFromAgeGroup,
} from "@/lib/teams/jahrgang-rules";

describe("jahrgang-rules — structured ageGroup / shortName resolution", () => {
  it("accepts canonical single-letter junior codes", () => {
    expect(normalizeJuniorCategoryCode("E")).toBe("E");
    expect(normalizeJuniorCategoryCode(" f ")).toBe("F");
  });

  it("resolves squad stufe tokens stored in ageGroup (e.g. FCA E1 / F2)", () => {
    expect(resolveStructuredJuniorCategoryFromAgeGroup("E1")).toBe("E");
    expect(resolveStructuredJuniorCategoryFromAgeGroup("F2")).toBe("F");
    expect(resolveStructuredJuniorCategoryFromAgeGroup("e1")).toBe("E");
  });

  it("does not treat display labels or adult categories as junior codes", () => {
    expect(resolveStructuredJuniorCategoryFromAgeGroup("Aktive")).toBeNull();
    expect(resolveStructuredJuniorCategoryFromAgeGroup(null)).toBeNull();
  });

  it("resolves FCA STAGE structured shortName / alternativeName (Junioren E1, E1)", () => {
    expect(resolveStructuredJuniorCategoryFromAgeGroup("Junioren E1")).toBe("E");
    expect(resolveStructuredJuniorCategoryFromAgeGroup("Junioren F2")).toBe("F");
    expect(resolveStructuredJuniorCategoryFromAgeGroup("Junioren D-7 D1")).toBe("D7");
    expect(resolveAuthoritativeTeamJuniorCategoryCode({
      ageGroup: null,
      shortName: "Junioren E1",
      alternativeName: "E1",
    })).toBe("E");
  });

  it("prefers ageGroup over shortName for authoritative team resolution", () => {
    expect(
      resolveAuthoritativeTeamJuniorCategoryCode({
        ageGroup: "E",
        shortName: "F1",
      }),
    ).toBe("E");
    expect(
      resolveAuthoritativeTeamJuniorCategoryCode({
        ageGroup: null,
        shortName: "E1",
      }),
    ).toBe("E");
  });
});
