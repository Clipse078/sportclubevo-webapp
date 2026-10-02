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

describe("TurniereManagementRow — SCE-ACTIVITY-UX-01R8 identity", () => {
  it("AWAY — TURNIER orange, Auswärts, organiser - location", () => {
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

    expect(screen.getByText("PlayMore Turnier")).toBeInTheDocument();
    expect(screen.getByText("TURNIER").getAttribute("data-activity-type-pill")).toBe(
      "tournament-orange",
    );
    expect(screen.getByText("Auswärts")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("FC Arisdorf - Gemeindesportplatz")).toBeInTheDocument();
    expect(screen.getByText(/1 Team/)).toBeInTheDocument();
    expect(screen.queryByText("FC Allschwil Junioren F2 - Gemeindesportplatz")).not.toBeInTheDocument();
  });

  it("HOME — Eigener Verein and tenant club - location", () => {
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

    expect(screen.getByText("Eigener Verein")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
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

    expect(screen.queryByText(/FC Allschwil Junioren F2 -/)).not.toBeInTheDocument();
    expect(screen.getByText("Gemeindesportplatz")).toBeInTheDocument();
  });
});
