/**
 * SCE-TOURNAMENT-PLANNER-01E3D roadmap contract tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01E3D roadmap", () => {
  it("documents qualification mapping package as current", () => {
    const doc = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01E3D.md");
    expect(doc).toContain("01E3D");
    expect(doc).toMatch(/CURRENT|IN PROGRESS/i);
    expect(doc).toContain("GROUP_RANK");
  });

  it("parent roadmap marks 01E3C closed and 01E3D current", () => {
    const parent = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(parent).toMatch(/01E3C.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/01E3D.*CURRENT|IN PROGRESS/i);
    expect(parent).toMatch(/01F.*NEXT|Smart Timing/i);
  });
});
