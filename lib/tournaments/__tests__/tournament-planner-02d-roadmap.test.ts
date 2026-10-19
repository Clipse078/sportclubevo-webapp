import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SCE-TOURNAMENT-PLANNER-02D roadmap", () => {
  it("documents predefined template architecture and boundaries", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02D.md"),
      "utf8",
    );
    expect(doc).toMatch(/Predefined Spielplan Templates/i);
    expect(doc).toMatch(/TEMPLATE_STORAGE.*code-backed/i);
    expect(doc).toMatch(/E_FF12_CURATED_COUNTS/i);
    expect(doc).toMatch(/F_CURATED_FIELD_PROPOSAL_COUNTS/i);
    expect(doc).toMatch(/PROPOSAL_NOT_LOCK.*YES/i);
    expect(doc).toMatch(/CATEGORY_AWARE_PROPOSAL.*YES/i);
    expect(doc).toMatch(/MANUAL_UAT_BY_CURSOR.*SKIPPED_PO_OWNED/i);
  });

  it("parent programme doc marks 02D in progress and 02E final", () => {
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(parent).toMatch(/02D.*Predefined Spielplan Templates/i);
    expect(parent).toMatch(/02E.*Spielplan UX/i);
  });
});
