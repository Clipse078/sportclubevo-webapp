import { describe, expect, it } from "vitest";
import {
  RESOURCE_CARD_SELECTED_CLASSES,
  RESOURCE_CARD_SELECTED_SUMMARY_CLASSES,
} from "../resource-card-selection-style";

describe("resource-card-selection-style — 02F2", () => {
  it("selected pitch classes stay dark (no white/light fill)", () => {
    expect(RESOURCE_CARD_SELECTED_CLASSES).toContain("bg-[var(--surface)]");
    expect(RESOURCE_CARD_SELECTED_CLASSES).not.toMatch(/\bbg-white\b/);
    expect(RESOURCE_CARD_SELECTED_CLASSES).not.toContain("bg-blue-50");
    expect(RESOURCE_CARD_SELECTED_CLASSES).toContain("sce-primary");
  });

  it("selected summary uses dark surface", () => {
    expect(RESOURCE_CARD_SELECTED_SUMMARY_CLASSES).toContain("bg-[var(--surface)]");
    expect(RESOURCE_CARD_SELECTED_SUMMARY_CLASSES).not.toContain("bg-blue-50");
  });
});
