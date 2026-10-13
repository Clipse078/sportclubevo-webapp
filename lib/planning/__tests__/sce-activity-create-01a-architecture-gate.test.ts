import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01A — architecture gate (docs-only package)", () => {
  it("documents 01A closure and ADR-11 acceptance", () => {
    expect(existsSync(join(root, "docs/roadmap/SCE-ACTIVITY-CREATE-01A.md"))).toBe(true);
    expect(existsSync(join(root, "docs/design/SCE-ACTIVITY-CREATION.md"))).toBe(true);

    const doc = read("docs/roadmap/SCE-ACTIVITY-CREATE-01A.md");
    expect(doc).toContain("CLOSED");
    expect(doc).toContain("CONDITIONAL_PASS_ACCEPTED");
    expect(doc).toContain("One creation language, domain-specific workflows");
    expect(doc).toContain("SceActivityComposer");

    const adrs = read("docs/design/SCE-UI-ROLLOUT-ADRS.md");
    expect(adrs).toContain("ADR-11");
    expect(adrs).toContain("Accepted");
    expect(adrs).toContain("SceActivityComposer");

    const creation = read("docs/design/SCE-ACTIVITY-CREATION.md");
    expect(creation).toContain(
      "Activity Composer must not launch another independent modal, dialog, sheet, or drawer",
    );
  });

  it("records 01A closure before 01B implementation", () => {
    const globHint = read("docs/roadmap/SCE-ACTIVITY-CREATE-01A.md");
    expect(globHint).toContain("ACTIVITY_COMPOSER_IMPLEMENTED");
    expect(globHint).toContain("| No |");
  });
});
