import { describe, expect, it } from "vitest";
import { formatClubMetaValue } from "../ClubDetailMetaValue";

describe("formatClubMetaValue", () => {
  it("returns empty label for null and dash", () => {
    expect(formatClubMetaValue(null)).toBe("Nicht hinterlegt");
    expect(formatClubMetaValue("-")).toBe("Nicht hinterlegt");
  });

  it("returns trimmed value when present", () => {
    expect(formatClubMetaValue("  Basel  ")).toBe("Basel");
  });
});
