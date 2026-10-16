/**
 * SCE-TOURNAMENT-PLANNER-01E1 roadmap integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "docs/roadmap");

describe("SCE-TOURNAMENT-PLANNER-01E1 documentation", () => {
  it("defines the 01E1 package doc", () => {
    const doc = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01E1.md"), "utf8");
    expect(doc).toContain("01E1");
    expect(doc).toContain("TENANT_ORGANISED");
    expect(doc).toContain("meetingsPerOpponent");
  });

  it("parent roadmap references 01E1", () => {
    const parent = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01.md"), "utf8");
    expect(parent).toContain("01E1");
  });
});
