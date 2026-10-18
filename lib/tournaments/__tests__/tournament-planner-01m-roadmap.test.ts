import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01M roadmap", () => {
  it("documents integrity + performance closure package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01M.md"),
      "utf8",
    );
    expect(doc).toMatch(/01M/);
    expect(doc).toMatch(/CLOSED \/ ACCEPTED \/ MERGED/i);
    expect(doc).toMatch(/PO UAT.*PASS/i);
    expect(doc).toMatch(/PARTICIPANT_LIMIT_IS_PRODUCT_RULE = NO/i);
    expect(doc).toMatch(/01L.*CLOSED|Predecessor.*01L/i);
    expect(doc).toMatch(/shouldUseLexicographicCompleteSearch/i);
    expect(doc).toMatch(/TOURNAMENT_PLANNER_02_STARTED.*NO/i);

    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01M.*CLOSED/i);
    expect(parent).toMatch(/CLOSED \/ ACCEPTED \/ MERGED/i);
    expect(parent).toMatch(/01L.*CLOSED/i);
    expect(parent).toMatch(/TOURNAMENT_PLANNER_02_STARTED.*YES|SCE-TOURNAMENT-PLANNER-02/);
  });
});
