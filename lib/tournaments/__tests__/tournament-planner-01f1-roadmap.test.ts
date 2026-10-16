/**
 * SCE-TOURNAMENT-PLANNER-01F1 roadmap contract tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01F1 roadmap", () => {
  it("documents smart timing foundation as current", () => {
    const doc = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01F1.md");
    expect(doc).toContain("01F1");
    expect(doc).toMatch(/CURRENT|IN PROGRESS/i);
    expect(doc).toContain("Smart Timing");
    expect(doc).toContain("01F2");
  });

  it("parent roadmap marks 01F1 current and 01E3D closed", () => {
    const parent = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(parent).toMatch(/01E3D.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/01F1.*CURRENT|Smart Timing Advisor/i);
  });
});
