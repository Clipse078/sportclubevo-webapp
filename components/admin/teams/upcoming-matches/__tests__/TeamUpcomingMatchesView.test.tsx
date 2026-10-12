/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TeamUpcomingMatchesView from "../TeamUpcomingMatchesView";
import { TEAM_COCKPIT_NEXT_MATCHES_DETAIL_LIMIT } from "@/lib/teams/team-cockpit-sporting-data";
import { createTeamCockpitMatchFixture } from "@/lib/teams/__tests__/team-cockpit-match-test-fixtures";

const FORMAT_CONFIG = { locale: "de-CH", timezone: "Europe/Zurich" };

describe("SCE-UI-ROLLOUT-01D — TeamUpcomingMatchesView (canonical SceMatchCard)", () => {
  it("renders multiple upcoming fixtures in ascending order", () => {
    const matches = [
      createTeamCockpitMatchFixture({ eventId: "event-earlier" }),
      createTeamCockpitMatchFixture({
        eventId: "event-later",
        startAt: new Date("2026-09-10T16:00:00.000Z"),
        opponentName: "FC Later",
        away: {
          displayName: "FC Later",
          isOwnTeam: false,
          clubName: "FC Later",
          logoUrl: "/later-crest.svg",
        },
      }),
    ];

    render(
      <TeamUpcomingMatchesView
        matches={matches}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const rows = screen.getAllByTestId(/^team-upcoming-match-event-/);
    expect(rows.map((row) => row.getAttribute("data-testid"))).toEqual([
      "team-upcoming-match-event-earlier",
      "team-upcoming-match-event-later",
    ]);
  });

  it("consumes SceMatchCard with fixture-authoritative home-left for home fixtures", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[createTeamCockpitMatchFixture({ side: "HOME" })]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-1");
    expect(card).toHaveAttribute("data-sce-match-card");
    expect(card).toHaveAttribute("data-density", "STANDARD");

    const home = within(card).getByText(/1\. Mannschaft|FC Allschwil/i);
    const away = within(card).getByText(/FC Example/i);
    expect(home.closest("[data-sce-match-side='home']")).toBeTruthy();
    expect(away.closest("[data-sce-match-side='away']")).toBeTruthy();
    expect(within(card).getByTestId("sce-match-card-link")).toHaveAttribute(
      "href",
      "/dashboard/activity/event/event-1",
    );
  });

  it("keeps away opponent home-left when tenant plays away", () => {
    const awayMatch = createTeamCockpitMatchFixture(
      {
        eventId: "event-away",
        side: "AWAY",
        home: {
          displayName: "FC Example",
          isOwnTeam: false,
          clubName: "FC Example",
          logoUrl: "/example-crest.svg",
        },
        away: {
          displayName: "1. Mannschaft",
          isOwnTeam: true,
          clubName: "FC Allschwil",
          logoUrl: "/tenant-crest.svg",
        },
      },
      {
        side: "AWAY",
        home: {
          canonicalTeamId: null,
          canonicalExternalTeamId: "ext-example",
          displayName: "FC Example",
          clubName: "FC Example",
          externalLogoUrl: "/example-crest.svg",
          providerTeamId: 200,
          providerTeamName: "FC Example",
        },
        away: {
          canonicalTeamId: "team-1",
          canonicalExternalTeamId: null,
          displayName: "1. Mannschaft",
          clubName: "FC Allschwil",
          externalLogoUrl: null,
          providerTeamId: 100,
          providerTeamName: "1. Mannschaft",
        },
      },
    );

    render(
      <TeamUpcomingMatchesView
        matches={[awayMatch]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-away");
    expect(within(card).getByText("FC Example").closest("[data-sce-match-side='home']")).toBeTruthy();
    expect(
      within(card).getByText("1. Mannschaft").closest("[data-sce-match-side='away']"),
    ).toBeTruthy();
  });

  it("does not render a fake 0:0 result for upcoming fixtures", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[createTeamCockpitMatchFixture()]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-1");
    expect(within(card).queryByText("0:0")).not.toBeInTheDocument();
  });

  it("renders schedule and location from canonical presentation", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[createTeamCockpitMatchFixture()]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-1");
    expect(within(card).getByTestId("sce-match-schedule")).toBeInTheDocument();
    expect(within(card).getByTestId("sce-match-location")).toHaveTextContent("Im Brüel");
  });

  it("renders competition when present", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[createTeamCockpitMatchFixture()]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-1");
    expect(within(card).getByText("Junioren A Promotion")).toBeInTheDocument();
  });

  it("renders empty state when no upcoming fixtures", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    expect(screen.getByTestId("team-upcoming-matches-empty")).toHaveTextContent(
      "Keine nächsten Spiele für 2026/2027 geplant.",
    );
  });

  it("renders postponed status via canonical status chip", () => {
    render(
      <TeamUpcomingMatchesView
        matches={[
          createTeamCockpitMatchFixture({
            eventId: "event-postponed",
            status: "POSTPONED",
            lifecycle: "POSTPONED",
          }),
        ]}
        seasonName="2026/2027"
        formatConfig={FORMAT_CONFIG}
      />,
    );

    const card = screen.getByTestId("team-upcoming-sce-match-event-postponed");
    expect(within(card).getByTestId("sce-match-status")).toHaveTextContent(/Verschoben/i);
  });

});

describe("TEAM-COCKPIT-PREMIUM-01F — detail limit constant", () => {
  it("uses a bounded detail limit of 10 fixtures", () => {
    expect(TEAM_COCKPIT_NEXT_MATCHES_DETAIL_LIMIT).toBe(10);
  });
});
