/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpieleMatchRecordWorkspace from "../SpieleMatchRecordWorkspace";
import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/admin/matchcenter/MatchcenterDetailOperational", () => ({
  default: (props: { layout?: string; onActionsBinding?: (b: unknown) => void }) => {
    props.onActionsBinding?.({ save: async () => {}, isDirty: false, saving: false });
    return (
      <div data-testid="matchcenter-detail-operational" data-layout={props.layout ?? "default"} />
    );
  },
}));

function createMatch(overrides: Partial<MatchcenterMatchDetail> = {}): MatchcenterMatchDetail {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-1",
    type: "MATCH",
    title: "FC Allschwil – FC Example",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-09-19T16:00:00.000Z"),
    endAt: new Date("2026-09-19T18:00:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-09-19T18:00:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 1,
      providerTeamName: "FC Allschwil",
      canonicalTeamId: "team-home",
      canonicalTeamName: "FC Allschwil 1. Mannschaft",
      displayName: "FC Allschwil 1. Mannschaft",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 2,
      providerTeamName: "FC Example",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Example",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "100",
      provider: "SFV",
      externalMatchId: 100,
      externalSeasonId: 2027,
      matchNumber: 5,
    },
    synchronization: {
      eventLastSyncedAt: new Date("2026-08-20T10:00:00.000Z"),
      mappingLastSyncedAt: null,
      detailSyncedAt: new Date("2026-08-20T10:30:00.000Z"),
      providerMatchState: 1,
      providerMatchStateName: "Geplant",
    },
    operational: {
      pitchCode: "KR3",
      homeDressingRoomCode: "O4",
      awayDressingRoomCode: "E1",
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: false,
      wochenplanVisible: true,
      trainingsplanVisible: false,
      teamPageVisible: true,
    },
    reviewStage: "APPROVED",
    publishedAt: null,
    organizerName: null,
    reviewRequestedAt: null,
    reviewedAt: null,
    reviewNotes: null,
    providerLeagueId: null,
    providerLeagueName: null,
    providerDivisionId: null,
    providerDivisionName: null,
    providerRoundNumber: null,
    providerOrganisationId: null,
    providerPlaygroundId: null,
    providerVenueName: null,
    providerSeasonName: null,
    ...overrides,
  };
}

describe("SpieleMatchRecordWorkspace", () => {
  it("renders match identity with home/away ordering and SFV source", () => {
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch()}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings
        canDelete={false}
        pitchOptions={[{ code: "KR3", name: "Kunstrasen 3" }]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner/week?typ=spiele"
      />,
    );

    expect(screen.getByTestId("spiele-match-record-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-detail-home-team")).toHaveTextContent(
      "FC Allschwil 1. Mannschaft",
    );
    expect(screen.getByTestId("matchcenter-detail-away-team")).toHaveTextContent("FC Example");
    expect(screen.getByTestId("spiele-record-source-chip")).toHaveTextContent("SFV");
    expect(screen.getByTestId("spiele-record-rail-wochenplaner")).toHaveAttribute(
      "href",
      "/dashboard/planner/week?typ=spiele",
    );
  });

  it("shows away context instead of home preparation section", () => {
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch({ homeAway: "AWAY", location: "Basel" })}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings={false}
        canDelete={false}
        pitchOptions={[]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner"
      />,
    );

    expect(screen.getByTestId("spiele-record-section-away")).toBeInTheDocument();
    expect(screen.queryByTestId("spiele-record-section-preparation")).not.toBeInTheDocument();
  });

  it("displays SFV result read-only when present", () => {
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch({
          scoreHome: 3,
          scoreAway: 1,
          resultLabel: "3:1",
        })}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings={false}
        canDelete={false}
        pitchOptions={[]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner"
      />,
    );

    expect(screen.getByTestId("spiele-record-section-result")).toBeInTheDocument();
    expect(screen.getAllByText(/vom SFV synchronisiert/i).length).toBeGreaterThan(0);
  });
});
