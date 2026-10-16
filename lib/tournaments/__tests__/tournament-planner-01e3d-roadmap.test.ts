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
  it("documents qualification mapping package as closed", () => {
    const doc = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01E3D.md");
    expect(doc).toContain("01E3D");
    expect(doc).toMatch(/CLOSED.*ACCEPTED.*MERGED/i);
    expect(doc).toContain("GROUP_RANK");
    expect(doc).toMatch(/01F.*NEXT|NOT STARTED/i);
  });

  it("parent roadmap marks 01E3D closed and 01F next", () => {
    const parent = read("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(parent).toMatch(/01E3D.*CLOSED.*MERGED/i);
    expect(parent).toMatch(/01F.*NEXT|Smart Timing/i);
    expect(parent).not.toMatch(/01E3D.*CURRENT/i);
  });
});
