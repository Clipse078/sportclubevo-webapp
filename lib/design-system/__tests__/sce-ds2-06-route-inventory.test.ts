/**
 * SCE-DS2-06R2 — route inventory integrity
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_06_CORRECTED_IN_R2_ROUTES,
  SCE_DS2_06_ROUTE_INVENTORY,
} from "@/lib/design-system/sce-ds2-06-route-inventory";
import { SCE_DS2_06_MANDATORY_ROUTES } from "@/lib/design-system/sce-ds2-06-meta";

const ROOT = process.cwd();

describe("SCE-DS2-06R2 route inventory", () => {
  it("indexes every authenticated page under app/(admin)", () => {
    expect(SCE_DS2_06_ROUTE_INVENTORY.length).toBeGreaterThanOrEqual(200);
    const routes = new Set(SCE_DS2_06_ROUTE_INVENTORY.map((e) => e.route));
    expect(routes.size).toBe(SCE_DS2_06_ROUTE_INVENTORY.length);
    for (const mandatory of SCE_DS2_06_MANDATORY_ROUTES) {
      expect(routes.has(mandatory), `missing mandatory route ${mandatory}`).toBe(true);
    }
  });

  it("does not treat immediate redirect aliases as canonical visual surfaces", () => {
    const aliases = SCE_DS2_06_ROUTE_INVENTORY.filter((entry) =>
      entry.action.startsWith("redirect alias"),
    );
    expect(aliases.length).toBeGreaterThanOrEqual(2);
    for (const alias of aliases) {
      expect(alias.pageArchitecture, alias.route).not.toBe("canonical");
      expect(alias.headerFinanceAligned, alias.route).toBe(false);
      expect(alias.tabsFinanceAligned, alias.route).toBe(false);
    }
  });

  it("stays in sync with the repository scanner", () => {
    const before = readFileSync(
      join(ROOT, "lib/design-system/sce-ds2-06-route-inventory.ts"),
      "utf8",
    );
    execSync("node scripts/sce-ds2-06-route-inventory-scan.mjs", {
      cwd: ROOT,
      stdio: "pipe",
    });
    const after = readFileSync(
      join(ROOT, "lib/design-system/sce-ds2-06-route-inventory.ts"),
      "utf8",
    );
    expect(after).toBe(before);
  });

  it("records DS2-06R2 corrected surfaces", () => {
    const teamsList = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === "/dashboard/teams");
    expect(teamsList?.pageArchitecture).toBe("canonical");
    expect(SCE_DS2_06_CORRECTED_IN_R2_ROUTES).toContain("/dashboard/teams");
  });
});
