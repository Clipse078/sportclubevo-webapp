import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Match create route — PLANNING-UX-04", () => {
  const pagePath = join(process.cwd(), "app/(admin)/dashboard/matchcenter/new/page.tsx");

  it("uses record shell + i18n planning editor header copy", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("SpieleRecordWorkspaceShell");
    expect(source).toContain('getTranslations("PlanningEditor.match.create")');
    expect(source).toContain("requireAnyPermission");
    expect(source).not.toMatch(/bg-white/);
  });
});
