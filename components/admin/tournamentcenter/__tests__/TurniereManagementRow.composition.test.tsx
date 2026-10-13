/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TurniereManagementRow from "../TurniereManagementRow";
import type { TournamentDto } from "@/lib/tournaments/types";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";

function baseTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "PlayMore Turnier",
    organizerName: "FC Allschwil",
    organizerLogoUrl: "https://cdn.example.com/fca.png",
    location: "Im Brüel",
    homeAway: "HOME",
    status: "SCHEDULED",
    startAt: "2027-06-01T08:15:00.000Z",
    endAt: "2027-06-01T10:00:00.000Z",
    competitionLabel: "Turnier",
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    participants: [
      {
        id: "p-1",
        kind: "TEAM",
        dressingRoomAllocations: [],
        team: {
          id: "team-1",
          name: "FC Allschwil Junioren F3",
          category: "JUNIOREN",
          ageGroup: "F3",
        },
      },
    ],
    team: null,
    resourceAllocations: [
      {
        id: "ra-1",
        facilityResourceId: "fr-1",
        facilityId: "f-1",
        facilityResourceCode: "KR2",
        facilityResourceName: "Kunstrasen 2",
        facilityName: "Im Brüel",
      },
    ],
    ...overrides,
  } as TournamentDto;
}

function countOccurrences(text: string, needle: string): number {
  if (!needle.trim()) return 0;
  let count = 0;
  let index = 0;
  while (index !== -1) {
    index = text.indexOf(needle, index);
    if (index === -1) break;
    count += 1;
    index += needle.length;
  }
  return count;
}

describe("TurniereManagementRow — SCE-UI-ROLLOUT-01F-R2 list-row composition", () => {
  it("renders management zones and avoids duplicated identity/context fields", () => {
    const tournament = baseTournament();
    const assessment = assessTournamentOperationalState(tournament);

    const { container } = render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage={false}
      />,
    );

    expect(screen.getByTestId("turniere-row-date-block")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-row-context-zone")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-row-status-zone")).toBeInTheDocument();

    const card = screen.getByTestId("turniere-sce-card-tournament-1");
    expect(card).toHaveAttribute("data-surface", "list-row");
    expect(card).not.toHaveTextContent("Start ");

    const rowText = container.textContent ?? "";
    expect(countOccurrences(rowText, "FC Allschwil")).toBe(1);
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren F3");
    const statusZone = screen.getByTestId("turniere-row-status-zone");
    expect(statusZone.textContent?.match(/Geplant|In Vorbereitung/)?.length).toBe(1);
    expect(countOccurrences(rowText, "Öffentlich")).toBe(1);

    const context = screen.getByTestId("turniere-row-context-zone");
    expect(within(context).getByTestId("turniere-row-context-time")).toBeInTheDocument();
    expect(within(context).getByTestId("turniere-row-context-location")).toBeInTheDocument();

    const scheduleInCard = within(card).queryByTestId("sce-tournament-compact-date");
    expect(scheduleInCard).toBeNull();
  });
});
