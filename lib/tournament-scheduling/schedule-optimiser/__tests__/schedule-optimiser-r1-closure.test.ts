import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HARD_CONSTRAINT_CATALOGUE } from "../../feasibility/constraints";
import { SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER } from "../../smart-timing/soft-objectives";
import { optimiseTournamentSchedule } from "../optimise";

const root = process.cwd();

describe("01F2 — architecture closure flags", () => {
  it("exports pure optimiser without persistence side effects", () => {
    expect(typeof optimiseTournamentSchedule).toBe("function");
    expect(SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER[0]).toBe("SATISFY_ALL_HARD_CONSTRAINTS");
    expect(HARD_CONSTRAINT_CATALOGUE.length).toBeGreaterThanOrEqual(10);
  });

  it("roadmap doc exists for 01F2", () => {
    const doc = readFileSync(join(root, "docs/roadmap/SCE-TOURNAMENT-PLANNER-01F2.md"), "utf8");
    expect(doc).toContain("OPTIMISER_PURE");
    expect(doc).toContain("SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER");
    expect(doc).toContain("BOUNDED_IMPROVEMENT_MAX_PASSES");
    expect(doc).toContain("baselineObjectiveMetrics");
    expect(doc).toContain("LARGE_SCHEDULE_BOUNDED_OPTIMISATION_IMPLEMENTED");
  });
});
