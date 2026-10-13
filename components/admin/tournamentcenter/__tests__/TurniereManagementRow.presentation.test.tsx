/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TurniereManagementRow from "../TurniereManagementRow";
import type { TournamentDto } from "@/lib/tournaments/types";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";

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
    participants: [
      {
        id: "p-1",
        dressingRoomAllocations: [],
        team: {
          id: "team-1",
          name: "FC Allschwil Junioren F2",
          category: "JUNIOREN",
          ageGroup: "F2",
        },
      },
    ],
    team: null,
    resourceAllocations: [],
    ...overrides,
  } as TournamentDto;
}

describe("TurniereManagementRow — SCE-UI-ROLLOUT-01F canonical card", () => {
  it("AWAY — organiser visible separately from venue on SceTournamentCard", () => {
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage={false}
      />,
    );

    const card = screen.getByTestId("turniere-sce-card-tournament-1");
    const context = screen.getByTestId("turniere-row-context-zone");
    expect(card).toHaveTextContent("PlayMore Turnier");
    expect(card).toHaveTextContent("FC Arisdorf");
    expect(context).toHaveTextContent("Gemeindesportplatz");
    expect(card).not.toHaveTextContent("Gemeindesportplatz");
    expect(card).not.toHaveTextContent("FC Arisdorf · Gemeindesportplatz");
    expect(card).toHaveAttribute("data-surface", "list-row");
  });

  it("HOME — organiser and venue without duplicating organiser in location line", () => {
    const tournament = baseTournament({
      homeAway: "HOME",
      organizerName: "FC Allschwil",
      location: "Im Brüel",
    });
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage={false}
      />,
    );

    const card = screen.getByTestId("turniere-sce-card-tournament-1");
    const context = screen.getByTestId("turniere-row-context-zone");
    expect(card).toHaveTextContent("FC Allschwil");
    expect(context).toHaveTextContent("Im Brüel");
    expect(card).not.toHaveTextContent("Im Brüel");
  });

  it("does not fabricate organiser from participating team", () => {
    const tournament = baseTournament({ organizerName: null, homeAway: "AWAY" });
    const assessment = assessTournamentOperationalState(tournament);

    render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage={false}
      />,
    );

    const card = screen.getByTestId("turniere-sce-card-tournament-1");
    const context = screen.getByTestId("turniere-row-context-zone");
    expect(card).not.toHaveTextContent("FC Allschwil Junioren F2");
    expect(context).toHaveTextContent("Gemeindesportplatz");
  });
});
