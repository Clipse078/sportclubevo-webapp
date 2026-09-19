import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clubDashboardSource = readFileSync(
  join(process.cwd(), "components/admin/dashboard/ClubDashboardView.tsx"),
  "utf8",
);

const operationalGridSource = readFileSync(
  join(process.cwd(), "components/ui/dashboard/DashboardOperationalGrid.tsx"),
  "utf8",
);

describe("DASHBOARD-UX-01B — dashboard structure contract", () => {
  it("orders personal modules before club-wide Heute im Verein", () => {
    const heuteIndex = clubDashboardSource.indexOf("<HeuteImVereinWidget");
    const meineAgendaIndex = clubDashboardSource.indexOf("<MeineAgendaWidget");
    const meineAufgabenIndex = clubDashboardSource.indexOf("<MeineAufgabenWidget");
    const attentionIndex = clubDashboardSource.indexOf('title="Benötigt Aufmerksamkeit"');
    const quickActionsIndex = clubDashboardSource.indexOf("Schnellaktionen");
    const newsIndex = clubDashboardSource.indexOf("Aktuelle News");
    const activityIndex = clubDashboardSource.indexOf("Letzte Aktivitäten");

    expect(meineAgendaIndex).toBeGreaterThan(-1);
    expect(meineAufgabenIndex).toBeGreaterThan(meineAgendaIndex);
    expect(heuteIndex).toBeGreaterThan(meineAufgabenIndex);
    expect(attentionIndex).toBeGreaterThan(meineAufgabenIndex);
    expect(quickActionsIndex).toBeGreaterThan(heuteIndex);
    expect(newsIndex).toBeGreaterThan(quickActionsIndex);
    expect(activityIndex).toBeGreaterThan(newsIndex);
  });

  it("places attention before Heute im Verein on smaller breakpoints", () => {
    expect(operationalGridSource).toContain("order-1 min-w-0 lg:order-2");
    expect(operationalGridSource).toContain("order-2 min-w-0 lg:order-1");
    expect(operationalGridSource.indexOf("clubAttention")).toBeLessThan(
      operationalGridSource.indexOf("order-1 min-w-0 lg:order-2"),
    );
  });

  it("uses standalone KPI strip instead of embedding KPIs in the hero", () => {
    expect(clubDashboardSource).toContain("DashboardMetricStrip");
    expect(clubDashboardSource).not.toContain("kpiGrid=");
  });

  it("does not expose task-model implementation language in dashboard source", () => {
    expect(clubDashboardSource).not.toContain("Aufgabenmodell");
  });
});
