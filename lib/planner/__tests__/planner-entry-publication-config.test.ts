import { describe, expect, it } from "vitest";
import {
  getPlannerPublicationRowsForType,
  hiddenPublicationFieldKeys,
} from "@/lib/planner/planner-entry-publication-config";

describe("getPlannerPublicationRowsForType", () => {
  it("MATCH exposes website, public wochenplan, and infoboard only", () => {
    const keys = getPlannerPublicationRowsForType("MATCH").map((r) => r.key);
    expect(keys).toEqual([
      "websiteVisible",
      "wochenplanVisible",
      "infoboardVisible",
    ]);
  });

  it("MATCH hides homepage, trainingsplan, and team page from editor UI", () => {
    const hidden = hiddenPublicationFieldKeys("MATCH");
    expect(hidden).toContain("homepageVisible");
    expect(hidden).toContain("trainingsplanVisible");
    expect(hidden).toContain("teamPageVisible");
  });

  it("TRAINING includes trainingsplan channel", () => {
    const keys = getPlannerPublicationRowsForType("TRAINING").map((r) => r.key);
    expect(keys).toContain("trainingsplanVisible");
    expect(keys).not.toContain("homepageVisible");
  });

  it("TOURNAMENT includes homepage with website dependency", () => {
    const homepage = getPlannerPublicationRowsForType("TOURNAMENT").find(
      (r) => r.key === "homepageVisible",
    );
    expect(homepage?.requiresWebsite).toBe(true);
  });
});
