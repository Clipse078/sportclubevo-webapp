/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-03 — operational activity icon adoption on planning surfaces.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import { PersonalProgrammeActivityIndicator } from "@/components/ui/calendar/PersonalProgrammeActivityIndicator";
import PlanningHubActivityBlock from "@/components/admin/planning-hub/PlanningHubActivityBlock";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import TurniereManagementRow from "@/components/admin/tournamentcenter/TurniereManagementRow";
import TrainingSessionManagementRow from "@/components/admin/training/TrainingSessionManagementRow";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type { TournamentDto } from "@/lib/tournaments/types";
import { assessTournamentOperationalState } from "@/lib/tournaments/operational-state";
import type { TrainingSessionManagementRow as TrainingSessionRow } from "@/lib/training/management-session-view";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function programmeItem(
  overrides: Partial<PersonalProgrammeItem> & Pick<PersonalProgrammeItem, "sourceType" | "title">,
): PersonalProgrammeItem {
  return {
    id: "item-1",
    startsAt: new Date("2026-09-27T16:00:00.000Z"),
    deepLink: "/dashboard/training",
    typeLabel: overrides.sourceType,
    ariaLabel: overrides.title,
    ...overrides,
  };
}

function baseWeekplannerItem(
  partial: Partial<WeekplannerItem> & Pick<WeekplannerItem, "id" | "type" | "title">,
): WeekplannerItem {
  return {
    tenantId: "t1",
    startAt: new Date("2026-09-20T07:30:00.000Z"),
    endAt: new Date("2026-09-20T09:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T07:30:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T09:30:00.000Z"),
    timeOverridden: false,
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    awayDressingRoomAllocations: [],
    tournamentParticipantAllocations: [],
    ...partial,
  } as WeekplannerItem;
}

function side(overrides: Partial<MatchcenterSide> = {}): MatchcenterSide {
  return {
    providerTeamId: 1,
    providerTeamName: "FC Allschwil E1",
    canonicalTeamId: "team-1",
    canonicalTeamName: "FC Allschwil E1",
    displayName: "FC Allschwil E1",
    resolution: "RESOLVED",
    isOwnTeam: true,
    ...overrides,
  };
}

function createMatch(overrides: Partial<MatchcenterMatchSummary> = {}): MatchcenterMatchSummary {
  return {
    id: "match-1",
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
    location: "St. Jakob-Park, Basel",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side(),
    away: side({ isOwnTeam: false, displayName: "FC Basel E1" }),
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "10001",
      provider: "SFV",
      externalMatchId: 10001,
      externalSeasonId: 2027,
      matchNumber: 12,
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
  } as MatchcenterMatchSummary;
}

function createTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "Blitzturnier",
    status: "SCHEDULED",
    startAt: new Date("2027-04-01T08:00:00.000Z"),
    endAt: new Date("2027-04-01T18:00:00.000Z"),
    location: "Sportanlage",
    competitionLabel: null,
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    teamLogoUrl: null,
    participants: [],
    team: null,
    visibility: {
      websiteVisible: false,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
      teamPageVisible: false,
    },
    ...overrides,
  } as TournamentDto;
}

function trainingSessionRow(overrides: Partial<TrainingSessionRow> = {}): TrainingSessionRow {
  return {
    sessionId: "sess-1",
    trainingSeriesId: "series-1",
    date: "2026-09-27",
    startAt: "2026-09-27T16:00:00.000Z",
    endAt: "2026-09-27T17:30:00.000Z",
    teamName: "Junioren F2",
    contextLabel: "Training",
    facilityLabel: "Platz 1",
    status: "SCHEDULED",
    displayStatus: "GEPLANT",
    exceptionReasons: [],
    ...overrides,
  };
}

function expectApprovedActivityIcon(container: HTMLElement, kind: string, registryName: string) {
  const marker = container.querySelector(`[data-sce-activity-kind="${kind}"]`);
  expect(marker).toBeTruthy();
  expect(marker).toHaveAttribute("data-sce-activity-icon", registryName);
  expect(marker?.querySelector("svg.sce-icon")).toHaveAttribute("viewBox", "0 0 64 64");
  expect(marker).toHaveAttribute("aria-hidden", "true");
}

describe("SCE-ICONS-03 PersonalProgrammeFeed", () => {
  it("renders SCE training and tournament icons on programme rows", () => {
    const training = programmeItem({
      id: "tr-1",
      sourceType: "TRAINING",
      title: "Junioren F2 Training",
      typeLabel: "Training",
    });
    const tournament = programmeItem({
      id: "to-1",
      sourceType: "TOURNAMENT",
      title: "Blitzturnier",
      typeLabel: "Turnier",
    });

    const { container: trainingContainer } = render(
      <PersonalProgrammeAgendaRow item={training} timeLabel="18:00" />,
    );
    expectApprovedActivityIcon(trainingContainer, "TRAINING", "training");

    const { container: tournamentContainer } = render(
      <PersonalProgrammeAgendaRow item={tournament} timeLabel="10:00" />,
    );
    expectApprovedActivityIcon(tournamentContainer, "TOURNAMENT", "tournament");

    const feedSource = readRelative("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    expect(feedSource).toContain("PersonalProgrammeAgendaRow");
  });
});

describe("SCE-ICONS-03 dashboard calendar markers", () => {
  it("resolves single-day preview through canonical activity mapping", () => {
    const { container } = render(
      <PersonalProgrammeActivityIndicator
        count={1}
        previewLabel="Training"
        primarySourceType="TRAINING"
      />,
    );
    expectApprovedActivityIcon(container, "TRAINING", "training");
    expect(screen.getByText("Training")).toBeInTheDocument();
  });

  it("uses SCE icons for multi-activity marker slots where mapped", () => {
    const { container } = render(
      <PersonalProgrammeActivityIndicator
        count={3}
        markerSourceTypes={["TRAINING", "MATCH", "TOURNAMENT"]}
        overflowCount={0}
      />,
    );
    expect(container.querySelector('[data-sce-activity-icon="training"]')).toBeTruthy();
    expect(container.querySelector('[data-sce-activity-icon="match"]')).toBeTruthy();
    expect(container.querySelector('[data-sce-activity-icon="tournament"]')).toBeTruthy();
  });
});

describe("SCE-ICONS-03 Wochenplaner activity blocks", () => {
  it("renders training, match, and tournament SCE icons on planner blocks", () => {
    for (const spec of [
      { type: "TRAINING" as const, icon: "training", title: "Junioren D Training" },
      { type: "MATCH" as const, icon: "match", title: "Junioren C1 vs FC X" },
      { type: "TOURNAMENT" as const, icon: "tournament", title: "Blitzturnier" },
    ]) {
      const item = baseWeekplannerItem({
        id: `${spec.type}-1`,
        type: spec.type,
        title: spec.title,
        teamNames: ["Team"],
      });
      const { container } = render(
        <PlanningHubActivityBlock
          item={item}
          locale="de-CH"
          timezone="Europe/Zurich"
          onActivate={() => {}}
        />,
      );
      expectApprovedActivityIcon(container, spec.type, spec.icon);
    }
  });
});

describe("SCE-ICONS-03 TrainingCenter records", () => {
  it("renders SCE training icon on session management rows", () => {
    const { container } = render(
      <TrainingSessionManagementRow
        row={trainingSessionRow()}
        wochenplanerHref="/dashboard/planner/week"
        canManage
        locale="de-CH"
        timezone="Europe/Zurich"
      />,
    );
    expectApprovedActivityIcon(container, "TRAINING", "training");
  });
});

describe("SCE-ICONS-03 MatchCenter records", () => {
  it("renders SCE match icon while preserving club crest markup", () => {
    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    const { container } = render(
      <SpieleManagementMatchRow
        match={match}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expectApprovedActivityIcon(container, "MATCH", "match");
    expect(container.querySelectorAll("svg.lucide-shield").length).toBeGreaterThanOrEqual(2);
  });
});

describe("SCE-ICONS-03 TournamentCenter records", () => {
  it("renders SCE tournament icon on management rows", () => {
    const tournament = createTournament();
    const assessment = assessTournamentOperationalState(tournament);
    const { container } = render(
      <TurniereManagementRow
        tournament={tournament}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage
      />,
    );
    expectApprovedActivityIcon(container, "TOURNAMENT", "tournament");
    expect(container.querySelector(`[data-testid="turniere-row-crest-${tournament.id}"]`)).toBeTruthy();
  });
});

describe("SCE-ICONS-03 fidelity on adopted surfaces", () => {
  it("routes operational surfaces through ActivitySceIcon instead of Lucide substitutes", () => {
    const paths = [
      "components/ui/dashboard/PersonalProgrammeAgendaRow.tsx",
      "components/ui/calendar/PersonalProgrammeActivityIndicator.tsx",
      "components/admin/planning-hub/PlanningHubActivityBlock.tsx",
      "components/admin/training/TrainingSessionManagementRow.tsx",
      "components/admin/matchcenter/SpieleManagementMatchRow.tsx",
      "components/admin/tournamentcenter/TurniereManagementRow.tsx",
    ];
    for (const path of paths) {
      const source = readRelative(path);
      expect(source).toContain("ActivitySceIcon");
      expect(source).not.toMatch(/\b(Dumbbell|Trophy)\b.*activityKind/);
    }
  });
});
