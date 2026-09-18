/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TurniereTournamentRecordWorkspace from "../TurniereTournamentRecordWorkspace";
import type { TournamentDto } from "@/lib/tournaments/types";
import { utcInstantToDateTimeLocalValue } from "@/lib/events/tenant-local-datetime";
import { TURNIERE_RECORD_MAIN_RAIL_GRID } from "../turniere-record-layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

const BASE_TOURNAMENT: TournamentDto = {
  id: "tournament-1",
  tenantId: "tenant-a",
  title: "U13 Hallenturnier",
  description: "Beschreibung",
  status: "SCHEDULED",
  source: "MANUAL",
  startAt: "2026-01-10T09:00:00.000Z",
  endAt: "2026-01-10T12:00:00.000Z",
  meetingTime: null,
  location: "Im Brüel",
  organizerName: "FC Allschwil",
  organizerLogoUrl: "https://example.com/crest.png",
  organizerExternalClubId: null,
  competitionLabel: "Hallenturnier",
  resultLabel: null,
  remarks: null,
  season: { id: "season-1", key: "2025-2026", name: "Saison 2025/2026" },
  team: null,
  teamLogoUrl: null,
  homeAway: "HOME",
  participants: [
    {
      id: "p1",
      tournamentId: "tournament-1",
      kind: "TEAM",
      displayName: "Junioren G",
      logoUrl: "https://example.com/tenant.png",
      team: {
        id: "team-1",
        name: "Junioren G",
        slug: "junioren-g",
        category: "JUNIOREN",
        genderGroup: null,
        ageGroup: "G",
      },
      externalTeam: null,
      externalClub: null,
      manualLabel: null,
      displayOrder: 0,
      dressingRoomAllocations: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  resourceAllocations: [
    {
      id: "ra1",
      facilityResourceId: "res-1",
      facilityResourceCode: "KR3",
      facilityResourceName: "Kunstrasen 3",
      facilityResourceType: "FULL_PITCH",
      facilityId: "fac-1",
      facilityName: "Im Brüel",
      notes: null,
      displayOrder: 0,
    },
  ],
  visibility: {
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    teamPageVisible: false,
  },
  reviewStage: "APPROVED",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

describe("TURNIERE-UX-02 record workspace", () => {
  it("renders canonical tournament identity with crest and sections", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        tenantLogoUrl="https://example.com/tenant.png"
        defaultTournamentDurationMinutes={120}
      />,
    );

    expect(screen.getByTestId("turniere-tournament-record-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-record-identity")).toHaveTextContent("U13 Hallenturnier");
    expect(screen.getByAltText(/FC Allschwil/i)).toHaveAttribute("src", "https://example.com/crest.png");
    expect(screen.getByTestId("turniere-record-section-overview")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-record-section-schedule")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-record-section-participants")).toHaveTextContent("1 Team");
    expect(screen.getByTestId("turniere-record-section-resources")).toHaveTextContent("KR3");
    expect(screen.getByTestId("turniere-record-section-publication")).toBeInTheDocument();
    expect(screen.getByTestId("turniere-record-context-rail")).toBeInTheDocument();
  });

  it("uses the wide-desktop main/rail grid contract", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        defaultTournamentDurationMinutes={120}
      />,
    );
    expect(screen.getByTestId("turniere-record-main-rail-grid").className).toContain(
      TURNIERE_RECORD_MAIN_RAIL_GRID,
    );
  });

  it("disables save until the record is dirty", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        defaultTournamentDurationMinutes={120}
      />,
    );

    const save = screen.getByTestId("tournament-save");
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByDisplayValue("U13 Hallenturnier"), {
      target: { value: "U13 Hallenturnier Updated" },
    });
    expect(save).not.toBeDisabled();
  });

  it("preserves persisted end time in the schedule section", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        defaultTournamentDurationMinutes={120}
      />,
    );

    const endInput = screen.getByLabelText(/^Ende$/i) as HTMLInputElement;
    expect(endInput.value).toBe(
      utcInstantToDateTimeLocalValue(BASE_TOURNAMENT.endAt!, "Europe/Zurich"),
    );
  });

  it("does not render fake registration or Spielplan controls", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={BASE_TOURNAMENT}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        defaultTournamentDurationMinutes={120}
      />,
    );

    expect(screen.queryByText(/Anmeldungen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Spielplan öffnen/i)).not.toBeInTheDocument();
  });

  it("hides HOME resource section for AWAY tournaments", () => {
    render(
      <TurniereTournamentRecordWorkspace
        tournament={{ ...BASE_TOURNAMENT, homeAway: "AWAY" }}
        canManage
        pitchHallFacilityGroups={[]}
        dressingRoomFacilityGroups={[]}
        timezone="Europe/Zurich"
        defaultTournamentDurationMinutes={120}
      />,
    );

    expect(screen.queryByTestId("turniere-record-section-resources")).not.toBeInTheDocument();
  });
});
