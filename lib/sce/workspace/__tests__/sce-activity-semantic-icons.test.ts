import { describe, expect, it } from "vitest";
import {
  SCE_ACTIVITY_SEMANTIC_ICONS,
  getSceActivitySemanticIcon,
} from "../sce-activity-semantic-icons";

describe("SCE-UI-STANDARD-01 — activity semantic icons", () => {
  it("exposes stable keys for NAV-01 adopters", () => {
    expect(Object.keys(SCE_ACTIVITY_SEMANTIC_ICONS).sort()).toEqual(
      [
        "communication",
        "documents",
        "location",
        "matchInfo",
        "mehr",
        "operations",
        "overview",
        "participation",
        "planning",
        "publication",
        "resources",
        "schedule",
        "settings",
        "squad",
        "tasks",
      ].sort(),
    );
  });

  it("returns the same component reference for a semantic key", () => {
    expect(getSceActivitySemanticIcon("publication")).toBe(SCE_ACTIVITY_SEMANTIC_ICONS.publication);
  });
});
