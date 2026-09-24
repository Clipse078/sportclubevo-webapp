import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

describe("DASHBOARD-UX-01B — superseded by DASHBOARD-06 structure", () => {
  it("uses personal command center composition (DASHBOARD-06)", () => {
    expect(clubDashboardSource).toContain("getPersonalCommandCenterData");
    expect(clubDashboardSource).not.toContain("HeuteImVereinWidget");
    expect(clubDashboardSource).not.toContain("DashboardMetricStrip");
  });

  it("omits Meine Aufgaben widget when personal tasks are unauthorized", () => {
    expect(clubDashboardSource).toContain("personalTasksAvailable");
    expect(clubDashboardSource).toMatch(
      /personalTasksAvailable\s*\?\s*\(\s*<PersonalTasksPreview/s,
    );
  });
});
