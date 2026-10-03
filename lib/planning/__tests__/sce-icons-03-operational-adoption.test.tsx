/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-03 — operational activity icon adoption on planning surfaces.
 * Programme / Matchcenter / Tournamentcenter management rows follow
 * SCE-ACTIVITY-DESIGN-01C01D meta-rail identity (see sce-icons-03r1-refinement).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
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
import {
  buildMatchActivityPresentation,
  buildTrainingActivityPresentation,
  buildTournamentActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    if (namespace === "PlanningEditor.match" && key === "activityTypeLabel") {
      return "Spiel";
    }
    if (namespace === "PersonalDashboard.programme") {
      const labels: Record<string, string> = {
        statusCancelled: "Abgesagt",
        statusPostponed: "Verschoben",
        allDay: "Ganztägig",
      };
      return labels[key] ?? key;
    }
    return key;
  },
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
    resourceAllocations: [],
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
  it("renders canonical type pills on programme meta rails (01C01D)", () => {
    const startAt = new Date("2026-09-27T16:00:00.000Z");
    const endAt = new Date("2026-09-27T17:30:00.000Z");
    const specs = [
      {
        sourceType: "TRAINING" as const,
        title: "Junioren F2 Training",
        pill: "TRAINING",
        palette: "training-blue",
        presentation: buildTrainingActivityPresentation({
          resourceKey: "training-session:tr-1",
          title: "Junioren F2 Training",
          typeLabel: "Training",
          clubName: "FC Allschwil",
          startAt,
          endAt,
        }),
      },
      {
        sourceType: "MATCH" as const,
        title: "Heimspiel",
        pill: "SPIEL",
        palette: "match-red",
        presentation: buildMatchActivityPresentation({
          resourceKey: "event:ma-1",
          title: "Heimspiel",
          typeLabel: "Spiel",
          teamName: "FC Allschwil",
          opponentName: "FC X",
          homeAway: "HOME",
          startAt,
          endAt,
          tenantClubName: "FC Allschwil",
        }),
      },
      {
        sourceType: "TOURNAMENT" as const,
        title: "Blitzturnier",
        pill: "TURNIER",
        palette: "tournament-orange",
        presentation: buildTournamentActivityPresentation({
          resourceKey: "event:to-1",
          title: "Blitzturnier",
          typeLabel: "Turnier",
          organiserName: "FC Allschwil",
          startAt,
          endAt,
        }),
      },
    ];

    for (const spec of specs) {
      const { container } = render(
        <PersonalProgrammeAgendaRow
          item={programmeItem({
            id: spec.sourceType,
            sourceType: spec.sourceType,
            title: spec.title,
            typeLabel: spec.title,
            activityPresentation: spec.presentation,
            endsAt: endAt,
          })}
          timeLabel="18:00"
          endTimeLabel="19:30"
        />,
      );
      const view = within(container);
      expect(view.getByTestId("sporting-activity-meta-rail")).toBeInTheDocument();
      expect(view.getByText(spec.pill).getAttribute("data-activity-type-pill")).toBe(spec.palette);
      expect(container.querySelector("[data-sce-activity-icon]")).toBeNull();
      cleanup();
    }

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
  it("preserves football-native fixture identity with SPIEL type pill (01C01D)", () => {
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
    expect(screen.getByText("SPIEL")).toBeInTheDocument();
    expect(container.querySelector('[data-activity-type-pill="match-red"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="spiele-management-match-identity"]')).toBeTruthy();
    expect(screen.getByText("VS")).toBeInTheDocument();
  });
});

describe("SCE-ICONS-03 TournamentCenter records", () => {
  it("renders organiser crest and TURNIER type pill on management rows (01C01D)", () => {
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
    expect(screen.getByText("TURNIER")).toBeInTheDocument();
    expect(container.querySelector('[data-activity-type-pill="tournament-orange"]')).toBeTruthy();
    expect(container.querySelector(`[data-testid="turniere-row-crest-${tournament.id}"]`)).toBeTruthy();
  });
});

describe("SCE-ICONS-03 fidelity on adopted surfaces", () => {
  it("routes calendar/planner/training surfaces through ActivitySceIcon instead of Lucide substitutes", () => {
    const iconPaths = [
      "components/ui/calendar/PersonalProgrammeActivityIndicator.tsx",
      "components/admin/planning-hub/PlanningHubActivityBlock.tsx",
      "components/admin/training/TrainingSessionManagementRow.tsx",
    ];
    for (const path of iconPaths) {
      const source = readRelative(path);
      expect(source).toContain("ActivitySceIcon");
      expect(source).not.toMatch(/\b(Dumbbell|Trophy)\b.*activityKind/);
    }

    const programmeSource = readRelative("components/ui/dashboard/PersonalProgrammeAgendaRow.tsx");
    expect(programmeSource).toContain("SportingActivityMetaRail");
    expect(programmeSource).not.toContain("ActivitySceIcon");

    const matchSource = readRelative("components/sporting-activity/SpieleManagementMatchIdentity.tsx");
    expect(matchSource).toContain("MatchClubPair");
    expect(matchSource).not.toContain("ActivitySceIcon");
  });
});
