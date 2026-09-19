/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SceModalOverlay shell contract SCE-RESPONSIVE-01L", () => {
  it("modal open lifecycle does not mutate sidebar width tokens", () => {
    const overlay = readSource("components/ui/SceModalOverlay.tsx");
    expect(overlay).not.toMatch(/setProperty\("--sce-sidebar-effective-width"/);
    expect(overlay).not.toMatch(/setProperty\("--sidebar-width"/);
  });

  it("shell-layout-vars derives effective width in CSS only", () => {
    const vars = readSource("lib/shell/shell-layout-vars.ts");
    expect(vars).toContain('removeProperty("--sce-sidebar-effective-width")');
    expect(vars).not.toMatch(/setProperty\("--sce-sidebar-effective-width"/);
  });
});
