import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01L roadmap", () => {
  it("documents responsive + accessibility polish package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01L.md"),
      "utf8",
    );
    expect(doc).toMatch(/01L/);
    expect(doc).toMatch(/Responsive \+ Accessibility \+ Polish/i);
    expect(doc).toMatch(/SCHEMA_CHANGE.*NO/i);
    expect(doc).toMatch(/NEW_OPTIMIZER_CALLS_FROM_PRESENTATION.*0/i);
    expect(doc).toMatch(/COLOR_ONLY_SEMANTICS = NO/i);
    expect(doc).toMatch(/01K.*CLOSED|Predecessor.*01K/i);

    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(doc).toMatch(/CLOSED \/ ACCEPTED \/ MERGED/i);
    expect(doc).toMatch(/PO UAT.*PASS/i);
    expect(doc).toMatch(/01M.*READY_FOR_PO_UAT|Integrity \+ Performance/i);
    expect(parent).toMatch(/01L.*CLOSED|01L CLOSED/i);
    expect(parent).toMatch(/01K.*CLOSED/i);
    expect(parent).toMatch(/01M.*READY_FOR_PO_UAT|IN PROGRESS/i);
  });
});
