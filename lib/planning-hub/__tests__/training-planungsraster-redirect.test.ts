import { describe, expect, it } from "vitest";
import { buildWochenplanerResourcesHrefFromLegacyTrainingParams } from "../training-planungsraster-redirect";

describe("buildWochenplanerResourcesHrefFromLegacyTrainingParams", () => {
  const now = new Date("2026-09-16T10:00:00.000Z");

  it("maps day context to ressourcen week and preserves filters", () => {
    const href = buildWochenplanerResourcesHrefFromLegacyTrainingParams({
      day: "2026-09-17",
      facility: "fac-1",
      team: "ts-1",
      conflicts: "1",
      category: "DRESSING_ROOM",
      timezone: "Europe/Zurich",
      now,
    });

    expect(href).toContain("/dashboard/planner/week");
    expect(href).toContain("ansicht=ressourcen");
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("facility=fac-1");
    expect(href).toContain("team=ts-1");
    expect(href).toContain("konflikte=1");
    expect(href).toContain("ressource=garderobe");
    expect(href).not.toContain("tab=planungsraster");
  });
});
