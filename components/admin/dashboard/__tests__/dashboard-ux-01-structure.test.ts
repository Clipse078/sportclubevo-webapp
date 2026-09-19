import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

describe("DASHBOARD-UX-01 — dashboard structure contract", () => {
  it("orders personal operational widgets before club context and tertiary content", () => {
    const meineAgendaIndex = clubDashboardSource.indexOf("MeineAgendaWidget");
    const meineAufgabenIndex = clubDashboardSource.indexOf("MeineAufgabenWidget");
    const heuteIndex = clubDashboardSource.indexOf("HeuteImVereinWidget");
    const attentionIndex = clubDashboardSource.indexOf("Benötigt Aufmerksamkeit");
    const quickActionsIndex = clubDashboardSource.indexOf("Schnellaktionen");
    const newsIndex = clubDashboardSource.indexOf("Aktuelle News");
    const activityIndex = clubDashboardSource.indexOf("Letzte Aktivitäten");

    expect(meineAgendaIndex).toBeGreaterThan(-1);
    expect(meineAufgabenIndex).toBeGreaterThan(meineAgendaIndex);
    expect(heuteIndex).toBeGreaterThan(meineAufgabenIndex);
    expect(attentionIndex).toBeGreaterThan(heuteIndex);
    expect(quickActionsIndex).toBeGreaterThan(attentionIndex);
    expect(newsIndex).toBeGreaterThan(quickActionsIndex);
    expect(activityIndex).toBeGreaterThan(newsIndex);
  });

  it("uses standalone KPI strip instead of embedding KPIs in the hero", () => {
    expect(clubDashboardSource).toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("kpiGrid=");
  });
});
