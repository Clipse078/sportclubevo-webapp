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
    expect(doc).toMatch(/SPIELPLAN_OPT_IN.*default OFF/i);
    expect(doc).toMatch(/PLAYING_FORMAT_OPTIONAL_BY_DEFAULT.*YES/i);
    expect(doc).toMatch(/ARBITRARY_PRODUCT_PARTICIPANT_MAX.*NONE/i);
    expect(doc).toMatch(/02D_PACKAGE_CLOSED.*YES/i);
    expect(doc).toMatch(/PO_UAT.*PASS/i);
    expect(doc).toMatch(/CLOSED \/ ACCEPTED \/ MERGED/i);
  });

  it("parent programme doc marks 02D closed and 02E next", () => {
    const parent = readFileSync(
      join(process.cwd(), "docs/roadmap/SCE-TOURNAMENT-PLANNER-02.md"),
      "utf8",
    );
    expect(parent).toMatch(/02D.*CLOSED \/ ACCEPTED \/ MERGED/i);
    expect(parent).toMatch(/02E.*Spielplan UX/i);
  });
});
