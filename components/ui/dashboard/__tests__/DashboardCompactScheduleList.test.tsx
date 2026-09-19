/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DashboardCompactScheduleList } from "@/components/ui/dashboard/DashboardCompactScheduleList";
import type { DashboardTodayTimelineItem } from "@/components/ui/dashboard/DashboardTodayTimeline";

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
  it("shows at most 6 rows initially with expand control", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 10 }, (_, index) => makeItem(index));

    render(<DashboardCompactScheduleList items={items} initialLimit={6} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("button", { name: /Alle 10 anzeigen/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Alle 10 anzeigen/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("does not show +N overflow for tournaments under the logo cap", () => {
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

    render(<DashboardCompactScheduleList items={[item]} showExpandControl={false} />);

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
    expect(screen.getByText("10 Teilnehmer")).toBeInTheDocument();
  });
});
