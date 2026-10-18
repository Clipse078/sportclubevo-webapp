/**
 * @vitest-environment jsdom
 *
 * TOURNAMENT-PLANNER-01K-R6.3 — Tournament Center direct card entry.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TurniereManagementRow from "../TurniereManagementRow";
import type { TournamentDto } from "@/lib/tournaments/types";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function baseTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "PlayMore Turnier",
    organizerName: "FC Arisdorf",
    organizerLogoUrl: null,
    location: "Gemeindesportplatz",
    homeAway: "AWAY",
    status: "SCHEDULED",
    startAt: "2027-06-01T08:00:00.000Z",
    endAt: "2027-06-01T18:00:00.000Z",
    competitionLabel: "Turnier",
    visibility: {
      websiteVisible: false,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    participants: [],
    team: null,
    resourceAllocations: [],
    ...overrides,
  } as TournamentDto;
}

describe("TurniereManagementRow — direct tournament entry (01K-R6.3)", () => {
  it("exposes primary navigation to tournament edit workspace", () => {
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    const nav = screen.getByTestId("turniere-row-nav-tournament-1");
    expect(nav).toHaveAttribute("href", "/dashboard/tournamentcenter/tournament-1/edit");
    expect(nav).toHaveAccessibleName(/PlayMore Turnier öffnen/i);
  });

  it("isolates row content from action menu via pointer-events layering", () => {
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    expect(screen.getByTestId("turniere-row-identity-tournament-1").className).toContain(
      "pointer-events-none",
    );
    expect(screen.getByTestId("turniere-row-context-zone").parentElement?.className).toContain(
      "pointer-events-none",
    );
    expect(screen.getByTestId("turniere-row-menu-tournament-1").parentElement?.className).toContain(
      "pointer-events-auto",
    );
  });

  it("three-dot menu trigger does not activate row overlay navigation", async () => {
    const user = userEvent.setup();
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    const menu = screen.getByTestId("turniere-row-menu-tournament-1");
    await user.click(menu);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-row-nav-tournament-1")).not.toHaveFocus();
  });

  it("menu edit action still links to tournament edit", async () => {
    const user = userEvent.setup();
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );

    await user.click(screen.getByTestId("turniere-row-menu-tournament-1"));

    const editItem = screen.getByRole("menuitem", { name: /Turnier bearbeiten/i });
    expect(editItem).toHaveAttribute("href", "/dashboard/tournamentcenter/tournament-1/edit");
  });

  it("supports keyboard focus on primary row navigation", () => {
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage={false}
      />,
    );

    const nav = screen.getByTestId("turniere-row-nav-tournament-1");
    nav.focus();
    expect(nav).toHaveFocus();
    expect(nav.className).toMatch(/focus-visible:ring/);
  });
});
