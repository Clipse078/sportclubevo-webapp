/**
 * SCE-DS2-CLEANUP-01 — foundation cleanup governance
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_CLEANUP_01_AUDIT,
  SCE_DS2_CLEANUP_01_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-cleanup-01-audit";
import { SCE_DS2_06_CONTRAST_PAIRS } from "@/lib/design-system/sce-ds2-06-contrast-pairs";
import { contrastRatio } from "@/lib/design-system/sce-white-edition-contrast";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-CLEANUP-01 foundation cleanup", () => {
  it("documents the package delivery note", () => {
    const doc = readRepo("docs/design-system-v2/19-ds2-cleanup-01-foundation-delivery.md");
    expect(doc).toContain(SCE_DS2_CLEANUP_01_PACKAGE_KEY);
    expect(SCE_DS2_CLEANUP_01_AUDIT.length).toBeGreaterThanOrEqual(8);
  });

  it("removes orphan dashboard/settings patterns and ScePageTabs alias", () => {
    expect(existsSync(join(ROOT, "components/ui/patterns/DashboardPattern.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "components/ui/patterns/SettingsPattern.tsx"))).toBe(false);
    expect(existsSync(join(ROOT, "components/sce/page/ScePageTabs.tsx"))).toBe(false);
    const patternsIndex = readRepo("components/ui/patterns/index.ts");
    expect(patternsIndex).not.toContain("DashboardPattern");
    expect(patternsIndex).not.toContain("SettingsPattern");
    const uiBarrel = readRepo("components/ui/index.ts");
    expect(uiBarrel).not.toMatch(/export \{ MotionIcon \}/);
  });

  it("keeps active route primitives (PageShell, Dialog, SceModalOverlay)", () => {
    expect(existsSync(join(ROOT, "components/ui/page/PageShell.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "components/ui/Dialog.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "components/ui/SceModalOverlay.tsx"))).toBe(true);
  });

  it("binds visual archetype smoke to semantic CSS variables", () => {
    const script = readRepo("scripts/sce-ds2-06-visual-archetypes-browser-check.mjs");
    expect(script).toContain("var(--sce-color-status-success)");
    expect(script).not.toContain("#166534");
  });

  it("extends contrast pairs for error, info, and badge semantics", () => {
    const ids = SCE_DS2_06_CONTRAST_PAIRS.map((p) => p.id);
    expect(ids).toContain("status-error-on-danger-light");
    expect(ids).toContain("status-info-on-info-light");
    expect(ids).toContain("badge-success-semantic-on-light");
    const failures: string[] = [];
    for (const pair of SCE_DS2_06_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      if (ratio < pair.minimumRatio) {
        failures.push(`${pair.id}: ${ratio.toFixed(2)}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("white edition maps danger/info status text for AA on light fills", () => {
    const globals = readRepo("app/globals.css");
    expect(globals).toMatch(
      /\[data-sce-theme="white"\][\s\S]*--sce-color-status-error:\s*#b91c1c/,
    );
    expect(globals).toMatch(
      /\[data-sce-theme="white"\][\s\S]*--sce-color-status-info:\s*#1d4ed8/,
    );
  });

  it("StatusIndicator uses semantic status color tokens", () => {
    const source = readRepo("components/ui/StatusIndicator.tsx");
    expect(source).toContain("--sce-color-status-success");
    expect(source).not.toMatch(/text-\[var\(--sce-success\)\]/);
  });
});
