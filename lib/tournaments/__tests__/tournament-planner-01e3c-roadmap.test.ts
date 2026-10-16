/**
 * SCE-TOURNAMENT-PLANNER-01E3C-R1 roadmap integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "docs/roadmap");

describe("SCE-TOURNAMENT-PLANNER-01E3C documentation", () => {
  it("defines knockout BYE topology and references 01E3D successor", () => {
    const doc = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01E3C.md"), "utf8");
    expect(doc).toContain("01E3C");
    expect(doc).toContain("OMITTED_FIXTURE_WITH_DIRECT_ENTRANT_OR_QUALIFICATION_SOURCE_ADVANCEMENT");
    expect(doc).toContain("01E3D");
    expect(doc).toMatch(/01E3D.*CURRENT/i);
  });

  it("parent roadmap marks 01E3C closed and 01E3D current", () => {
    const parent = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01.md"), "utf8");
    expect(parent).toContain("01E3C");
    expect(parent).toContain("01E3B");
    expect(parent).toMatch(/01E3C.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/01E3D.*CURRENT/i);
    expect(parent).toContain("Smart Timing Advisor");
  });
});
