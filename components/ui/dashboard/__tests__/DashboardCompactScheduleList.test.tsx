/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCompactScheduleList } from "@/components/ui/dashboard/DashboardCompactScheduleList";
import type { DashboardTodayTimelineItem } from "@/components/ui/dashboard/DashboardTodayTimeline";
import { DASHBOARD_TODAY_PREVIEW_LIMIT } from "@/lib/dashboard/compact-schedule-presentation";

function makeItem(index: number): DashboardTodayTimelineItem {
  return {
    key: `event-${index}`,
    sortAt: new Date(`2026-09-08T${String(8 + index).padStart(2, "0")}:00:00Z`),
    timeLabel: `${8 + index}:00`,
    typeLabel: "Spiel",
    eventType: "MATCH",
    title: `Spiel ${index}`,
    href: `/dashboard/planner/edit/event-${index}`,
    matchPresentation: {
      competitionLabel: "Liga",
      home: { displayName: `Home ${index}`, logoUrl: null },
      away: { displayName: `Away ${index}`, logoUrl: null },
    },
  };
}

describe("DashboardCompactScheduleList", () => {
  it("shows at most the preview limit with navigation CTA", () => {
    const items = Array.from({ length: 10 }, (_, index) => makeItem(index));

    render(
      <DashboardCompactScheduleList
        items={items}
        initialLimit={DASHBOARD_TODAY_PREVIEW_LIMIT}
        viewAllHref="/dashboard/planner/day?day=2026-09-08"
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(DASHBOARD_TODAY_PREVIEW_LIMIT);
    const viewAll = screen.getByRole("link", { name: /Alle 10 anzeigen/ });
    expect(viewAll).toHaveAttribute("href", "/dashboard/planner/day?day=2026-09-08");
  });

  it("shows overflow indicator for compact tournament participant logos", () => {
    const item: DashboardTodayTimelineItem = {
      key: "t-1",
      sortAt: new Date("2026-09-08T10:00:00Z"),
      timeLabel: "10:00",
      typeLabel: "Turnier",
      eventType: "TOURNAMENT",
      title: "PlayMore Turnier",
      tournamentParticipants: Array.from({ length: 10 }, (_, index) => ({
        displayName: `Team ${index}`,
        logoUrl: null,
      })),
    };

    render(<DashboardCompactScheduleList items={[item]} />);

    expect(screen.getByText("+6")).toBeInTheDocument();
    expect(screen.getByText("10 Teilnehmer")).toBeInTheDocument();
  });
});
