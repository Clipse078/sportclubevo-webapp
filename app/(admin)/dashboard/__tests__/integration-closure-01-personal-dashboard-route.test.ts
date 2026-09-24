/**
 * INTEGRATION-CLOSURE-01 — regression sentinel: /dashboard must stay on the
 * personal command center path (ClubDashboardView), not legacy routing forks.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/page.tsx"),
  "utf8",
);

describe("INTEGRATION-CLOSURE-01 — /dashboard route contract", () => {
  it("renders ClubDashboardView for club workspace (personal command center shell)", () => {
    expect(pageSource).toContain("ClubDashboardView");
    expect(pageSource).not.toMatch(/getCommandCenterData/);
    expect(pageSource).not.toContain("DashboardMetricStrip");
    expect(pageSource).not.toContain("HeuteImVereinWidget");
  });
});
