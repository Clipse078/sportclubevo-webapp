/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parseSfvMatchDateTime } from "@/lib/integrations/sfv/sync/provider-time";
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
    kickoffKnown: true,
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

  function countHomeAwayIndicators(container: HTMLElement): number {
    const homeAwayPill = container.querySelector('[data-testid="matchcenter-detail-homeaway"]');
    const readinessPills = container.querySelectorAll('[data-testid="spiele-record-readiness-pill"]');
    let count = homeAwayPill ? 1 : 0;
    for (const pill of readinessPills) {
      const text = pill.textContent?.trim() ?? "";
      if (/Auswärtsspiel|Heimspiel/i.test(text)) {
        count += 1;
      }
    }
    return count;
  }

  it("A/D. AWAY header renders exactly one HOME/AWAY semantic indicator", () => {
    const { container } = render(
      <SpieleMatchRecordWorkspace
        match={createMatch({
          homeAway: "AWAY",
          location: "In den Widen, Arlesheim – wird vor Ort zugeteilt",
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

    expect(screen.getByTestId("matchcenter-detail-homeaway")).toHaveTextContent("Auswärtsspiel");
    expect(screen.queryByTestId("spiele-record-readiness-pill")).not.toBeInTheDocument();
    expect(countHomeAwayIndicators(container)).toBe(1);
    expect(screen.queryByText(/^AUSWÄRTSSPIEL$/)).not.toBeInTheDocument();
  });

  it("B. HOME header renders exactly one HOME/AWAY semantic indicator", () => {
    const { container } = render(
      <SpieleMatchRecordWorkspace
        match={createMatch({ homeAway: "HOME" })}
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

    expect(screen.getByTestId("matchcenter-detail-homeaway")).toHaveTextContent("Heimspiel");
    expect(countHomeAwayIndicators(container)).toBe(1);
  });

  it("C. HOME header can show HEIMSPIEL and Bereit readiness together", () => {
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch({
          homeAway: "HOME",
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
        })}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings={false}
        canDelete={false}
        pitchOptions={[{ code: "KR3", name: "Kunstrasen 3" }]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner"
      />,
    );

    expect(screen.getByTestId("matchcenter-detail-homeaway")).toHaveTextContent("Heimspiel");
    const readinessPills = screen.getAllByTestId("spiele-record-readiness-pill");
    expect(readinessPills.some((el) => el.textContent?.includes("Bereit"))).toBe(true);
  });

  it("E. SFV unknown kickoff still renders Zeit offen and no operational end in schedule", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch({
          homeAway: "AWAY",
          startAt,
          kickoffKnown: false,
          endAt: null,
          operationalEndAt: startAt,
          location: "In den Widen, Arlesheim",
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

    expect(screen.getByTestId("spiele-record-kickoff")).toHaveTextContent("Zeit offen");
    expect(screen.getByTestId("spiele-record-context-rail")).toHaveTextContent("Zeit offen");
    expect(screen.queryByText("02:00")).not.toBeInTheDocument();
  });

  it("F. known kickoff still renders HH:mm in record schedule", () => {
    render(
      <SpieleMatchRecordWorkspace
        match={createMatch({
          startAt: parseSfvMatchDateTime("2026-09-19T20:30:00"),
          kickoffKnown: true,
          endAt: null,
          operationalEndAt: parseSfvMatchDateTime("2026-09-19T22:30:00"),
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

    expect(screen.getByTestId("spiele-record-kickoff")).toHaveTextContent("20:30");
  });

  it("shows Aufgabe erstellen only when canCreateTask", async () => {
    const { rerender } = render(
      <SpieleMatchRecordWorkspace
        match={createMatch()}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings={false}
        canDelete={false}
        pitchOptions={[]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner/week"
        canCreateTask={false}
      />,
    );
    expect(screen.queryByTestId("spiele-record-menu-create-task")).not.toBeInTheDocument();

    rerender(
      <SpieleMatchRecordWorkspace
        match={createMatch()}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManageMappings={false}
        canDelete={false}
        pitchOptions={[]}
        dressingRoomOptions={[]}
        isProtectedSource
        wochenplanerHref="/dashboard/planner/week"
        canCreateTask
      />,
    );
    fireEvent.click(screen.getByTestId("spiele-record-context-menu-trigger"));
    const link = screen.getByTestId("spiele-record-menu-create-task");
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/aufgaben/neu?contextType=MATCH&contextId=match-1",
    );
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
