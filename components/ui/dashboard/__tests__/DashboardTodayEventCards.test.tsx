/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardTodayMatchCard,
  DashboardTodayTournamentCard,
} from "@/components/ui/dashboard/DashboardTodayEventCards";
import type { DashboardTodayTimelineItem } from "@/components/ui/dashboard/DashboardTodayTimeline";

const matchItem: DashboardTodayTimelineItem = {
  key: "event-1",
  sortAt: new Date("2026-09-08T20:15:00Z"),
  timeLabel: "20:15",
  typeLabel: "Spiel",
  eventType: "MATCH",
  title: "Spiel",
  meta: "Im Brüel, Allschwil · Kunstrasen 2",
  competitionLabel: "2. Liga (FAEW)",
  href: "/dashboard/planner/edit/evt-1",
  venuePresentation: {
    groups: [
      { kind: "location", label: "Im Brüel, Allschwil" },
      { kind: "pitch", label: "Kunstrasen 2" },
      {
        kind: "dressing-rooms",
        label: "Heim O1 · Gast E4",
        ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
        dressingRooms: {
          semantics: "home-away",
          ariaLabel: "Heim Garderobe O1, Gast Garderobe E4",
          sides: [
            { roleLabel: "Heim", rooms: ["O1"] },
            { roleLabel: "Gast", rooms: ["E4"] },
          ],
        },
      },
    ],
  },
  matchPresentation: {
    competitionLabel: "2. Liga (FAEW)",
    home: {
      displayName: "FC Heim",
      logoUrl: "https://cdn.example/home.png",
      clubLine: "FC Heim",
      teamLine: "1. Mannschaft",
    },
    away: { displayName: "FC Gast", logoUrl: "https://cdn.example/away.png" },
  },
};

const tournamentItem: DashboardTodayTimelineItem = {
  key: "event-2",
  sortAt: new Date("2026-09-08T09:00:00Z"),
  timeLabel: "09:00",
  typeLabel: "Turnier",
  eventType: "TOURNAMENT",
  title: "F-Junioren Herbstturnier",
  venuePresentation: {
    groups: [{ kind: "location", label: "Im Brüel, Allschwil" }],
  },
  tournamentParticipants: [
    { displayName: "Team A", logoUrl: null },
    { displayName: "Team B", logoUrl: null },
  ],
};

describe("DashboardTodayMatchCard", () => {
  it("renders premium fixture hierarchy with venue metadata", () => {
    render(<DashboardTodayMatchCard item={matchItem} />);

    expect(screen.getByText("FC Heim")).toBeInTheDocument();
    expect(screen.getByText("1. Mannschaft")).toBeInTheDocument();
    expect(screen.getByText("FC Gast")).toBeInTheDocument();
    expect(screen.getByText("VS")).toBeInTheDocument();
    expect(screen.getByText("2. Liga (FAEW)")).toBeInTheDocument();
    expect(screen.getByText("SPIEL")).toBeInTheDocument();
    expect(screen.getByText("Im Brüel, Allschwil")).toBeInTheDocument();
    expect(screen.getByText("Kunstrasen 2")).toBeInTheDocument();
    expect(screen.getByText("Heim")).toBeInTheDocument();
    expect(screen.getByText("O1")).toBeInTheDocument();
    expect(screen.getByText("Gast")).toBeInTheDocument();
    expect(screen.getByText("E4")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Heim Garderobe O1, Gast Garderobe E4"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", matchItem.href);
  });

  it("uses compact match logos", () => {
    const { container } = render(<DashboardTodayMatchCard item={matchItem} />);
    const logos = container.querySelectorAll("img");
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect(logo.className).toMatch(/h-10|w-10/);
    }
  });
});

describe("DashboardTodayTournamentCard", () => {
  it("renders tournament hierarchy with participant summary", () => {
    render(<DashboardTodayTournamentCard item={tournamentItem} />);

    expect(screen.getByText("TURNIER")).toBeInTheDocument();
    expect(screen.getByText("F-Junioren Herbstturnier")).toBeInTheDocument();
    expect(screen.getByText("2 Teilnehmer")).toBeInTheDocument();
    expect(screen.getByText("Im Brüel, Allschwil")).toBeInTheDocument();
  });
});
