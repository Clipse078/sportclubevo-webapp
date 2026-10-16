/**
 * SCE-TOURNAMENT-PLANNER-01E3A roadmap integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "docs/roadmap");

describe("SCE-TOURNAMENT-PLANNER-01E3A documentation", () => {
  it("defines the 01E3A package doc and staged 01E3 slices", () => {
    const doc = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01E3A.md"), "utf8");
    expect(doc).toContain("01E3A");
    expect(doc).toContain("GROUP_MIX_ONLY");
    expect(doc).toContain("01E3B");
    expect(doc).toContain("TournamentPhase");
    expect(doc).toContain("GROUP_RANK");
  });

  it("parent roadmap references 01E3A as closed and 01E3B as next", () => {
    const parent = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01.md"), "utf8");
    expect(parent).toContain("01E3A");
    expect(parent).toContain("CLOSED / ACCEPTED / MERGED");
    expect(parent).toContain("01E3B");
  });
});
