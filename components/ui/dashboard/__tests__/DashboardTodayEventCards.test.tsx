/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardTodayMatchCard } from "@/components/ui/dashboard/DashboardTodayEventCards";
import type { DashboardTodayTimelineItem } from "@/components/ui/dashboard/DashboardTodayTimeline";

const matchItem: DashboardTodayTimelineItem = {
  key: "event-1",
  sortAt: new Date("2026-09-08T20:15:00Z"),
  timeLabel: "20:15",
  typeLabel: "Spiel",
  eventType: "MATCH",
  title: "Spiel",
  meta: "Im Brüel · Feld 2",
  competitionLabel: "2. Liga",
  href: "/dashboard/planner/edit/evt-1",
  matchPresentation: {
    competitionLabel: "2. Liga",
    home: { displayName: "FC Heim", logoUrl: "https://cdn.example/home.png" },
    away: { displayName: "FC Gast", logoUrl: "https://cdn.example/away.png" },
  },
};

describe("DashboardTodayMatchCard", () => {
  it("renders home vs away fixture composition with canonical data only", () => {
    render(<DashboardTodayMatchCard item={matchItem} />);

    expect(screen.getByText("FC Heim")).toBeInTheDocument();
    expect(screen.getByText("FC Gast")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expect(screen.getByText("2. Liga")).toBeInTheDocument();
    expect(screen.getByText("Im Brüel · Feld 2")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", matchItem.href);
  });
});
