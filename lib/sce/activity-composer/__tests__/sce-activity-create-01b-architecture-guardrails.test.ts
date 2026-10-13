import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01B — architecture guardrails", () => {
  it("ships SceActivityComposer using canonical Context Tabs", () => {
    const composer = read("components/sce/activity-composer/SceActivityComposer.tsx");
    expect(composer).toContain("SceContextTabs");
    expect(composer).not.toContain("SceComposerTabs");
    expect(composer).toContain("SceContextDirtyGuardProvider");
  });

  it("overlay includes modal semantics; page mode excludes dialog role", () => {
    const shell = read("components/sce/activity-composer/SceActivityComposerShell.tsx");
    expect(shell).toContain('isModalSurface ? "dialog"');
  });

  it("does not introduce generic /api/activity endpoint in composer module", () => {
    const composerDir = read("components/sce/activity-composer/SceActivityComposer.tsx");
    expect(composerDir).not.toContain("/api/activity");
    expect(existsSync(join(root, "app/api/activity/route.ts"))).toBe(false);
  });

  it("preview harness uses SwitchToggle (Toggle First) — no new binary checkboxes", () => {
    const harness = read("components/sce/activity-composer/SceActivityComposerPreviewHarness.tsx");
    expect(harness).toContain("SwitchToggle");
    expect(harness).not.toMatch(/type=["']checkbox["']/);
  });

  it("documents nested interaction rule", () => {
    const rule = read("lib/sce/activity-composer/nested-interaction-rule.ts");
    expect(rule).toContain("NO_INDEPENDENT_NESTED_MODAL_OVER_COMPOSER");
  });

  it("does not migrate production domain /new routes in 01B", () => {
    for (const route of [
      "app/(admin)/dashboard/veranstaltungen/new/page.tsx",
      "app/(admin)/dashboard/training/new/page.tsx",
      "app/(admin)/dashboard/matchcenter/new/page.tsx",
      "app/(admin)/dashboard/tournamentcenter/new/page.tsx",
    ]) {
      const source = read(route);
      expect(source).not.toContain("SceActivityComposer");
    }
  });
});
