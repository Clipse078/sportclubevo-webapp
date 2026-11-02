import { describe, expect, it } from "vitest";
import {
  resolveVenuePresentationDensity,
  scaleVenuePresentationClamp,
  venuePresentationDensityScale,
  VENUE_PRESENTATION_DENSITY_ATTR,
} from "@/lib/infoboard/venue-presentation-density";

describe("venue presentation density (R5)", () => {
  it("selects spacious for one activity on the page", () => {
    expect(resolveVenuePresentationDensity(1)).toBe("spacious");
  });

  it("selects spacious for two activities on the page", () => {
    expect(resolveVenuePresentationDensity(2)).toBe("spacious");
  });

  it("selects standard for three or more activities", () => {
    expect(resolveVenuePresentationDensity(3)).toBe("standard");
    expect(resolveVenuePresentationDensity(6)).toBe("standard");
  });

  it("exposes stable data attribute name", () => {
    expect(VENUE_PRESENTATION_DENSITY_ATTR).toBe("data-venue-density");
  });

  it("scales clamp tokens without changing geometry selectors", () => {
    const base = "clamp(2rem, 3cqw, 4rem)";
    const scaled = scaleVenuePresentationClamp(base, "standard");
    expect(scaled).not.toBe(base);
    expect(scaled).toContain("clamp(");
    expect(venuePresentationDensityScale("spacious")).toBeGreaterThan(
      venuePresentationDensityScale("standard"),
    );
  });
});
