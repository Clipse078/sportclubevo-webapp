/**
 * SCE-TOURNAMENT-PLANNER-01E3B roadmap integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "docs/roadmap");

describe("SCE-TOURNAMENT-PLANNER-01E3B documentation", () => {
  it("defines group formation package and staged 01E3 slices", () => {
    const doc = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01E3B.md"), "utf8");
    expect(doc).toContain("01E3B");
    expect(doc).toContain("SERPENTINE_BALANCED_CAPACITY");
    expect(doc).toContain("PARTICIPANT_COUNT_ONLY");
    expect(doc).toContain("tournamentGroupId");
    expect(doc).toContain("01E3C");
  });

  it("parent roadmap marks 01E3B current and 01E3A closed", () => {
    const parent = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01.md"), "utf8");
    expect(parent).toContain("01E3B");
    expect(parent).toContain("01E3A");
  });
});
