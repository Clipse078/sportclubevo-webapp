/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDevelopmentOverview from "../ClubDevelopmentOverview";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ClubDevelopmentOverview", () => {
  it("shows empty states and query-backed KPI zeros without demo process table", () => {
    render(
      <ClubDevelopmentOverview
        targets={[]}
        initiatives={[]}
        upcomingMeetings={[]}
        assignedTasks={[]}
        governance={{
          pendingApprovals: [],
          staleTargets: [],
          templateDrafts: [],
          overdueActions: [],
        }}
        kpis={{
          activeTargetCount: 0,
          activeInitiativeCount: 0,
          upcomingMeetingCount: 0,
          overdueActionCount: 0,
          myOpenTaskCount: 0,
          overdueTaskCount: 0,
        }}
      />,
    );

    expect(screen.getAllByText("Aktive Ziele").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText("Keine aktiven Ziele sichtbar.")).toBeTruthy();
    expect(screen.getByText("Keine laufenden Vorhaben sichtbar.")).toBeTruthy();
    expect(screen.queryByText("Aktive Prozesse")).toBeNull();
    expect(screen.queryByText("Demo-Daten — nicht produktiv")).toBeNull();

    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).toContain("/vereinsleitung/strategie-und-ziele");
    expect(hrefs).toContain("/vereinsleitung/vorhaben-und-umsetzung");
    expect(hrefs).toContain("/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben");
    expect(hrefs).toContain("/vereinsleitung/strategie-und-ziele?ansicht=ziele");

    const shortcutTitles = screen
      .getAllByRole("heading", { level: 3 })
      .slice(0, 4)
      .map((el) => el.textContent);
    expect(shortcutTitles).toEqual([
      "Strategie & Ziele",
      "Vorhaben & Umsetzung",
      "Sitzungen",
      "Prozesse & Richtlinien",
    ]);
  });
});