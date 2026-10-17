import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01G roadmap", () => {
  it("documents 01G package and 01H next", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01G.md"),
      "utf8",
    );
    expect(doc).toMatch(/01G/);
    expect(doc).toMatch(/TIME_AND_PITCH/);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01G.*CURRENT|01G = CURRENT/i);
    expect(parent).toMatch(/01H/);
  });
});
