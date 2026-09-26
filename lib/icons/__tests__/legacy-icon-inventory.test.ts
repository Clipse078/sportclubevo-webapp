import { describe, expect, it } from "vitest";
import { runLegacyIconInventory } from "../legacy-icon-inventory";

describe("legacy icon inventory", () => {
  it("returns structured counts without throwing", () => {
    const report = runLegacyIconInventory();
    expect(report.enforcementActive).toBe(false);
    expect(report.bySource["lucide-react"]).toBeDefined();
  });
});
