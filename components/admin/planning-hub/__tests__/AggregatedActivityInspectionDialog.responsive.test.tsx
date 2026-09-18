import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("AggregatedActivityInspectionDialog SCE-RESPONSIVE-01", () => {
  it("uses workspace dialog contract without raw 92vw sizing", () => {
    const source = readSource(
      "components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx",
    );
    expect(source).toContain("SceModalOverlay");
    expect(source).toContain("SCE_DIALOG_WORKSPACE_PANEL");
    expect(source).not.toContain("92vw");
    expect(source).not.toMatch(/left:\s*280/);
    expect(source).toContain("useSceModalDialog");
    expect(source).not.toMatch(/panelRef\.current\?\.focus\(\)/);
    expect(source).not.toMatch(/window\.scrollTo/);
  });

  it("O — header is outside the primary scrolling activity list region", () => {
    const source = readSource(
      "components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx",
    );
    const headerIdx = source.indexOf("<header");
    const listScrollIdx = source.indexOf('className="min-h-0 flex-1 overflow-auto overflow-x-auto"');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(listScrollIdx).toBeGreaterThan(headerIdx);
  });
});
