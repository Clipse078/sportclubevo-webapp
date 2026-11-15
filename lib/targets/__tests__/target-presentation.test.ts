import { describe, expect, it } from "vitest";
import {
  TARGET_PERIOD_LABELS,
  formatTargetPeriodLabel,
  formatTargetStatusLabel,
} from "../target-presentation";

describe("target presentation labels", () => {
  it("renders German period enum labels", () => {
    expect(TARGET_PERIOD_LABELS.SEASON).toBe("Saison");
    expect(formatTargetPeriodLabel("QUARTER")).toBe("Quartal");
    expect(formatTargetPeriodLabel("CUSTOM", "Saison 2026/27")).toBe("Saison 2026/27");
  });

  it("renders German target status labels", () => {
    expect(formatTargetStatusLabel("ACTIVE")).toBe("Aktiv");
    expect(formatTargetStatusLabel("DRAFT")).toBe("Entwurf");
  });
});