import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01A — architecture gate (docs-only package)", () => {
  it("documents 01A research and ADR-11 recommendation", () => {
    expect(existsSync(join(root, "docs/roadmap/SCE-ACTIVITY-CREATE-01A.md"))).toBe(true);
    expect(existsSync(join(root, "docs/design/SCE-ACTIVITY-CREATION.md"))).toBe(true);

    const doc = read("docs/roadmap/SCE-ACTIVITY-CREATE-01A.md");
    expect(doc).toContain("IMPLEMENTED_PENDING_ARCHITECTURE_REVIEW");
    expect(doc).toContain("CONDITIONAL_PASS");
    expect(doc).toContain("SceActivityComposer");

    const adrs = read("docs/design/SCE-UI-ROLLOUT-ADRS.md");
    expect(adrs).toContain("ADR-11");
    expect(adrs).toContain("SceActivityComposer");
  });

  it("does not ship SceActivityComposer product implementation in 01A", () => {
    const globHint = read("docs/roadmap/SCE-ACTIVITY-CREATE-01A.md");
    expect(globHint).toContain("ACTIVITY_COMPOSER_IMPLEMENTED");
    expect(globHint).toContain("| No |");

    // Composer component must not exist yet — 01B scope.
    expect(existsSync(join(root, "components/sce/activity-composer/SceActivityComposer.tsx"))).toBe(
      false,
    );
  });
});
