/**
 * SCE-TOURNAMENT-PLANNER-01D-R3 — roadmap dependency correction integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());

function readDoc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("SCE-TOURNAMENT-PLANNER-01D-R3 documentation", () => {
  it("does not present future 01J/01K packages before delivered 01D", () => {
    const programme = readDoc("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    expect(programme).toContain("01D-R3");
    expect(programme).toContain("01D can close before 01E");
    expect(programme).not.toMatch(
      /\|\s*1\s*\|\s*\*\*01C-EXT \/ 01J\*\*/,
    );
    expect(programme).not.toMatch(
      /\|\s*3\s*\|\s*\*\*01D\*\*\s*\|\s*Feasibility \(in progress\)/,
    );
  });

  it("lists dependency-correct future sequence after 01D", () => {
    const programme = readDoc("docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md");
    const dIndex = programme.indexOf("| 4 | **01D**");
    const e1Index = programme.indexOf("| 5 | **01E1**");
    const fIndex = programme.indexOf("| 6 | **01F**");
    expect(dIndex).toBeGreaterThan(-1);
    expect(e1Index).toBeGreaterThan(dIndex);
    expect(fIndex).toBeGreaterThan(e1Index);
  });

  it("registers 01D-R3 closure flags on package doc", () => {
    const doc = readDoc("docs/roadmap/SCE-TOURNAMENT-PLANNER-01D.md");
    expect(doc).toContain("01D-R3");
    expect(doc).toContain("01D_CAN_CLOSE_BEFORE_FUTURE_GENERATORS");
    expect(doc).toContain("STRUCTURAL_CAPACITY_FEASIBILITY");
    expect(doc).toContain("PARTICIPANT_PATH_FEASIBILITY");
    expect(doc).toContain("TECHNICAL_LIMIT_REQUALIFICATION_PACKAGE");
  });
});
