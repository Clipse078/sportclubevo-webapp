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

  it("uses SwitchToggle for capability settings (binary control compliance)", () => {
    expect(read("components/admin/finance/FinanceSettingsPanel.tsx")).toContain("SwitchToggle");
    expect(read("components/admin/finance/FinanceSettingsPanel.tsx")).not.toContain('type="checkbox"');
  });
});
