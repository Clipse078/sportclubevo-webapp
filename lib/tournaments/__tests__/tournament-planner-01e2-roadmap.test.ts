/**
 * SCE-TOURNAMENT-PLANNER-01E2 roadmap integrity.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "docs/roadmap");

describe("SCE-TOURNAMENT-PLANNER-01E2 documentation", () => {
  it("defines the 01E2 package doc", () => {
    const doc = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01E2.md"), "utf8");
    expect(doc).toContain("01E2");
    expect(doc).toContain("SMART_MIX");
    expect(doc).toContain("targetMatchesPerParticipant");
    expect(doc).toContain("TENANT_ORGANISED");
  });

  it("parent roadmap references 01E2 as closed", () => {
    const parent = readFileSync(join(ROOT, "SCE-TOURNAMENT-PLANNER-01.md"), "utf8");
    expect(parent).toContain("01E2");
    expect(parent).toContain("CLOSED / MERGED");
  });
});
