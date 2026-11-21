/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDevelopmentOverview from "../ClubDevelopmentOverview";
import type { VereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const emptyDashboard: VereinsentwicklungLeadershipDashboard = {
  membership: {
    accessible: true,
    scopeLabel: "Vereinsweit",
    headcount: 120,
    standDateIso: "2025-06-01T00:00:00.000Z",
    currentPeriodLabel: "Jun. 2024 – Jun. 2025",
    entriesCurrent: 5,
    entriesPrevious: 4,
    exitsCurrent: 2,
    exitsPrevious: 1,
    trendKind: "up",
    trendLabel: "Mehr Netto-Eintritte als im Vorjahresfenster",
    drillDownHref: "/dashboard/persons",
  },
  actionRows: [],
  nextMeeting: null,
  meetingsListHref: "/vereinsleitung/meetings",
  myOpenTaskCount: 0,
  clubOverdueTaskCount: 0,
};

const emptyPreview: VereinsentwicklungOverviewPreview = {
  strategies: [],
  targets: [],
  tasks: [],
  showStrategien: true,
  showZiele: true,
  showAufgaben: true,
};

describe("ClubDevelopmentOverview leadership dashboard", () => {
  it("renders overview record sections above legacy blocks", () => {
    render(
      <ClubDevelopmentOverview
        dashboard={emptyDashboard}
        overviewPreview={emptyPreview}
        canSeeMeetings
        orgEinheitQuery={{}}
      />,
    );

    expect(screen.getByTestId("vereinsentwicklung-overview-record-sections")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-strategien")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-ziele")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-aufgaben")).toBeTruthy();
    expect(screen.queryByTestId("vereinsentwicklung-section-umsetzung")).toBeNull();
    expect(screen.getByTestId("vereinsentwicklung-section-handlungsbedarf")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-membership")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-meetings")).toBeTruthy();
    expect(screen.queryByTestId("vereinsentwicklung-overview-shortcuts")).toBeNull();
  });

  it("preserves org scope on Alle anzeigen links", () => {
    render(
      <ClubDevelopmentOverview
        dashboard={emptyDashboard}
        overviewPreview={emptyPreview}
        canSeeMeetings={false}
        orgEinheitQuery={{ [CD_WORKSPACE_ORG_UNIT_QUERY]: "ou-jun" }}
      />,
    );
    const strategienAll = screen.getByTestId("vereinsentwicklung-overview-strategien-all");
    expect(strategienAll.getAttribute("href")).toContain(`${CD_WORKSPACE_ORG_UNIT_QUERY}=ou-jun`);
  });

  it("shows quiet handlungsbedarf empty state", () => {
    render(
      <ClubDevelopmentOverview
        dashboard={emptyDashboard}
        overviewPreview={emptyPreview}
        canSeeMeetings={false}
        orgEinheitQuery={{}}
      />,
    );
    expect(screen.getByText("Keine offenen Punkte, die Ihre Aufmerksamkeit brauchen.")).toBeTruthy();
  });
});