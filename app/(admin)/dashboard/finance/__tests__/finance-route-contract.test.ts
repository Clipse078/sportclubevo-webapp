import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("FIN-01B finance routes", () => {
  it("declares canonical /dashboard/finance workspace", () => {
    expect(read("app/(admin)/dashboard/finance/page.tsx")).toContain("FINANCE_WORKSPACE_ROUTE_V1");
    expect(read("lib/finance/finance-architecture.ts")).toContain('"/dashboard/finance"');
  });

  it("registers finance in canonical nav config", () => {
    expect(read("lib/nav/nav-config.ts")).toContain('href: "/dashboard/finance"');
    expect(read("lib/nav/nav-config.ts")).toContain("PERMISSIONS.FINANCE_VIEW");
  });

  it("uses canonical switch toggles for capability settings (binary control compliance)", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("@/components/ui/SwitchToggle");
    expect(panel).toMatch(/SwitchToggle|SwitchThumb/);
    expect(panel).not.toContain('type="checkbox"');
  });
});
