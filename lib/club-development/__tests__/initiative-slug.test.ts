import { describe, expect, it } from "vitest";
import { slugifyInitiativeTitle } from "../initiative-slug";

describe("slugifyInitiativeTitle", () => {
  it("normalizes German umlauts", () => {
    expect(slugifyInitiativeTitle("Zürich Engagement")).toBe("zuerich-engagement");
  });

  it("never returns an empty slug", () => {
    const slug = slugifyInitiativeTitle("!!!");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug.startsWith("initiative-")).toBe(true);
  });
});