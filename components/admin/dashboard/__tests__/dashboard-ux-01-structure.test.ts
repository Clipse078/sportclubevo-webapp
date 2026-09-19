import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

describe("DASHBOARD-UX-01 — dashboard structure contract", () => {
  it("orders operational club context before personal modules and tertiary content", () => {
    const heuteIndex = clubDashboardSource.indexOf("<HeuteImVereinWidget");
    const attentionIndex = clubDashboardSource.indexOf('title="Benötigt Aufmerksamkeit"');
    const meineAgendaIndex = clubDashboardSource.indexOf("<MeineAgendaWidget");
    const meineAufgabenIndex = clubDashboardSource.indexOf("<MeineAufgabenWidget");
    const quickActionsIndex = clubDashboardSource.indexOf("Schnellaktionen");
    const newsIndex = clubDashboardSource.indexOf("Aktuelle News");
    const activityIndex = clubDashboardSource.indexOf("Letzte Aktivitäten");

    expect(heuteIndex).toBeGreaterThan(-1);
    expect(attentionIndex).toBeGreaterThan(heuteIndex);
    expect(meineAgendaIndex).toBeGreaterThan(attentionIndex);
    expect(meineAufgabenIndex).toBeGreaterThan(meineAgendaIndex);
    expect(quickActionsIndex).toBeGreaterThan(meineAufgabenIndex);
    expect(newsIndex).toBeGreaterThan(quickActionsIndex);
    expect(activityIndex).toBeGreaterThan(newsIndex);
  });

  it("uses standalone KPI strip instead of embedding KPIs in the hero", () => {
    expect(clubDashboardSource).toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("kpiGrid=");
  });
});
