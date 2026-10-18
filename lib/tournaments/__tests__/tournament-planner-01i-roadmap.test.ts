import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("01I roadmap", () => {
  it("documents manual adjustment package", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01I.md"),
      "utf8",
    );
    expect(doc).toMatch(/01I/);
    expect(doc).toMatch(/Manual adjustment|Manuelle/i);
    expect(doc).toMatch(/validateTournamentManualAssignment|manual-assignment/i);
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-01.md"),
      "utf8",
    );
    expect(parent).toMatch(/01H.*CLOSED|01H CLOSED/i);
    expect(parent).toMatch(/01I.*CLOSED|01I CLOSED|CLOSED \/ ACCEPTED \/ MERGED.*01I/i);
    expect(parent).toMatch(/01J.*CURRENT|01J.*CLOSED|01J.*NEXT|NOT STARTED/i);
    expect(doc).toMatch(/CLOSED.*ACCEPTED.*MERGED|PO final UAT.*PASS/i);
  });
});
