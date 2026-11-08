/**
 * SCE-DS2-04R4 — inline match preparation editing in Spielplanung accordion.
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SpieleManagementMatchPreparationPanel from "@/components/admin/matchcenter/SpieleManagementMatchPreparationPanel";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const toastDanger = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: { danger: toastDanger, success: vi.fn() } }),
}));

vi.mock("@/hooks/use-facility-availability", () => ({
  useFacilityAvailability: () => ({
    pitchAvailability: new Map(),
    dressingRoomAvailability: new Map(),
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function side(overrides: Partial<MatchcenterSide> = {}): MatchcenterSide {
  const displayName = overrides.displayName ?? "FC Allschwil E1";
  return {
    providerTeamId: 1,
    providerTeamName: displayName,
    canonicalTeamId: "team-1",
    canonicalTeamName: displayName,
    displayName,
    resolution: "RESOLVED",
    isOwnTeam: true,
    ...overrides,
  };
}

function createMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "match-home-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "FC Allschwil E1 – FC Basel E1",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2027-03-05T16:00:00.000Z"),
    endAt: new Date("2027-03-05T18:00:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2027-03-05T18:00:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({ isOwnTeam: true }),
    away: side({ isOwnTeam: false, displayName: "FC Basel E1" }),
    source: {
      eventSource: "MANUAL",
      externalSource: null,
      externalSourceId: null,
      provider: null,
      externalMatchId: null,
      externalSeasonId: null,
      matchNumber: null,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: null,
      providerMatchStateName: null,
    },
    operational: {
      pitchCode: null,
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
    },
    ...overrides,
  };
}

const PITCH_GROUPS: FacilityGroup[] = [
  {
    facilityId: "f1",
    facilityName: "Im Brüel",
    facilityType: "SPORTS_GROUND",
    resources: [
      {
        id: "res-kr2",
        code: "KR2",
        name: "Kunstrasen 2",
        type: "FULL_PITCH",
        facilityId: "f1",
        facilityName: "Im Brüel",
        facilityType: "SPORTS_GROUND",
      },
    ],
  },
];

const DRESSING_GROUPS: FacilityGroup[] = [
  {
    facilityId: "f2",
    facilityName: "Kabinen",
    facilityType: "DRESSING_BLOCK",
    resources: [
      {
        id: "res-o4",
        code: "O4",
        name: "Kabine O4",
        type: "DRESSING_ROOM",
        facilityId: "f2",
        facilityName: "Kabinen",
        facilityType: "DRESSING_BLOCK",
      },
    ],
  },
];

describe("SCE-DS2-04R4 — SpieleManagementMatchPreparationPanel", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockRefresh.mockReset();
    toastDanger.mockReset();
  });

  it("renders read-only checklist when user cannot manage allocations", () => {
    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    render(
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={PITCH_GROUPS}
        dressingRoomFacilityGroups={DRESSING_GROUPS}
        canManageOperationalAllocations={false}
        canManagePublication={false}
      />,
    );

    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
    expect(screen.queryByTestId("matchcenter-inline-pitch-match-home-1")).not.toBeInTheDocument();
  });

  it("persists pitch assignment via PATCH and refreshes on success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    render(
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={PITCH_GROUPS}
        dressingRoomFacilityGroups={DRESSING_GROUPS}
        canManageOperationalAllocations
        canManagePublication
      />,
    );

    const pitchRow = screen.getByTestId("matchcenter-inline-pitch-match-home-1");
    await user.click(screen.getByTestId("matchcenter-inline-pitch-match-home-1-action"));

    await waitFor(() => {
      expect(screen.getByTestId("matchcenter-inline-pitch-match-home-1-picker-panel")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("matchcenter-inline-pitch-match-home-1-picker-option-KR2"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/matchcenter/match-home-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ pitchCode: "KR2" }),
        }),
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(pitchRow).toBeInTheDocument();
  });

  it("rolls back optimistic pitch on PATCH failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Belegt" }),
    });

    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    render(
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={PITCH_GROUPS}
        dressingRoomFacilityGroups={DRESSING_GROUPS}
        canManageOperationalAllocations
        canManagePublication
      />,
    );

    await user.click(screen.getByTestId("matchcenter-inline-pitch-match-home-1-action"));
    await waitFor(() =>
      expect(screen.getByTestId("matchcenter-inline-pitch-match-home-1-picker-panel")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("matchcenter-inline-pitch-match-home-1-picker-option-KR2"));

    await waitFor(() => {
      expect(toastDanger).toHaveBeenCalledWith("Belegt", expect.any(Object));
    });
    expect(screen.getByText("unassignedPitchHall")).toBeInTheDocument();
  });

  it("toggles infoboard visibility when publication manage is granted", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    render(
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={PITCH_GROUPS}
        dressingRoomFacilityGroups={DRESSING_GROUPS}
        canManageOperationalAllocations
        canManagePublication
      />,
    );

    await user.click(screen.getByTestId("matchcenter-inline-infoboard-toggle-match-home-1"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/matchcenter/match-home-1",
        expect.objectContaining({
          body: JSON.stringify({ infoboardVisible: true }),
        }),
      );
    });
  });

  it("disables infoboard toggle without publication permission", () => {
    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    render(
      <SpieleManagementMatchPreparationPanel
        match={match}
        assessment={assessment}
        pitchHallFacilityGroups={PITCH_GROUPS}
        dressingRoomFacilityGroups={DRESSING_GROUPS}
        canManageOperationalAllocations
        canManagePublication={false}
      />,
    );

    expect(screen.getByTestId("matchcenter-inline-infoboard-toggle-match-home-1")).toBeDisabled();
  });
});
