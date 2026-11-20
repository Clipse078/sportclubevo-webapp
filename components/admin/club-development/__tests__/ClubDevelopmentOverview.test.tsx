/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDevelopmentOverview from "../ClubDevelopmentOverview";
import type { VereinsentwicklungLeadershipDashboard } from "@/lib/club-development/vereinsentwicklung-leadership-dashboard";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
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
  umsetzung: {
    activeTargetCount: 1,
    aggregate: { completedCount: 1, totalCount: 2, percent: 50, contributingTaskIds: ["t1"] },
    aggregateCaption: "1 von 2 Aufgaben erledigt",
    targetRows: [],
    drillDownHref: "/vereinsleitung/vorhaben-und-umsetzung?ansicht=aufgaben",
  },
  actionRows: [],
  nextMeeting: null,
  meetingsListHref: "/vereinsleitung/meetings",
  myOpenTaskCount: 0,
  clubOverdueTaskCount: 0,
};

describe("ClubDevelopmentOverview leadership dashboard", () => {
  it("renders structured sections without duplicate workspace shortcut cards", () => {
    render(
      <ClubDevelopmentOverview dashboard={emptyDashboard} canSeeMeetings orgEinheitQuery={{}} />,
    );

    expect(screen.getByTestId("vereinsentwicklung-section-membership")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-umsetzung")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-handlungsbedarf")).toBeTruthy();
    expect(screen.getByTestId("vereinsentwicklung-section-meetings")).toBeTruthy();
    expect(screen.getByText("1 von 2 Aufgaben erledigt")).toBeTruthy();
    expect(screen.queryByTestId("vereinsentwicklung-overview-shortcuts")).toBeNull();
    expect(screen.queryByText("Vorhaben")).toBeNull();
  });

  it("shows quiet handlungsbedarf empty state", () => {
    render(
      <ClubDevelopmentOverview dashboard={emptyDashboard} canSeeMeetings={false} orgEinheitQuery={{}} />,
    );
    expect(screen.getByText("Keine offenen Punkte, die Ihre Aufmerksamkeit brauchen.")).toBeTruthy();
  });
});