/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import SpieleMatchRecordWorkspace from "../SpieleMatchRecordWorkspace";
import type { MatchcenterMatchDetail } from "@/lib/matchcenter/types";
import ActivityDetailNavigation from "@/components/admin/activity-navigation/ActivityDetailNavigation";
import { buildActivityTabNavigationConfig } from "@/lib/activity-navigation/configs";
import { ActivityDirtyNavigationProvider } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import { ActivityDetailTabProvider } from "@/lib/activity-navigation/use-activity-detail-tab";
import { SCE_ACTIVITY_NAV_TABLIST_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/matchcenter/match-1",
  useSearchParams: () => new URLSearchParams("tab=mehr"),
}));

vi.mock("@/components/admin/matchcenter/MatchcenterDetailOperational", () => ({
  default: (props: { onActionsBinding?: (b: unknown) => void }) => {
    props.onActionsBinding?.({ save: async () => {}, isDirty: false, saving: false });
    return <div data-testid="matchcenter-detail-operational" />;
  },
}));

function createMatch(overrides: Partial<MatchcenterMatchDetail> = {}): MatchcenterMatchDetail {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-1",
    type: "MATCH",
    title: "Test",
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
      providerTeamName: "Home",
      canonicalTeamId: "team-home",
      canonicalTeamName: "Home Team",
      displayName: "Home Team",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 2,
      providerTeamName: "Away",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "Away Team",
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
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
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

describe("SCE-ACTIVITY-NAV-01 UAT R1 — Match workspace", () => {
  it("does not render legacy right rail or duplicate publication editors", () => {
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <SpieleMatchRecordWorkspace
          match={createMatch()}
          locale="de-CH"
          timezone="Europe/Zurich"
          canManageMappings
          canDelete={false}
          pitchOptions={[]}
          dressingRoomOptions={[]}
          isProtectedSource
          wochenplanerHref="/dashboard/planner/week?typ=spiele"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByTestId("spiele-record-right-rail")).toBeNull();
    expect(screen.queryByTestId("spiele-record-context-rail")).toBeNull();
    expect(screen.getAllByTestId("spiele-record-publication-panel")).toHaveLength(1);
  });

  it("keeps provider and last-changed metadata on Mehr", () => {
    render(
      <NextIntlClientProvider locale="de" messages={deMessages}>
        <SpieleMatchRecordWorkspace
          match={createMatch()}
          locale="de-CH"
          timezone="Europe/Zurich"
          canManageMappings={false}
          canDelete={false}
          pitchOptions={[]}
          dressingRoomOptions={[]}
          isProtectedSource
          wochenplanerHref="/dashboard/planner"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByTestId("spiele-record-source")).toBeInTheDocument();
    expect(screen.getByTestId("spiele-record-last-changed")).toBeInTheDocument();
  });
});

describe("SCE-ACTIVITY-NAV-01 UAT R1 — activity nav overflow", () => {
  it("uses horizontal tablist class without invalid scrollbar utility", () => {
    const config = buildActivityTabNavigationConfig({ kind: "MATCH", matchSquadAvailable: true });

    const { container } = render(
      <ActivityDirtyNavigationProvider>
        <ActivityDetailTabProvider config={config}>
          <ActivityDetailNavigation config={config} testId="match-activity-nav" />
        </ActivityDetailTabProvider>
      </ActivityDirtyNavigationProvider>,
    );

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist?.className).toContain(SCE_ACTIVITY_NAV_TABLIST_CLASS);
    expect(tablist?.className).not.toContain("scrollbar-thin");
  });
});
