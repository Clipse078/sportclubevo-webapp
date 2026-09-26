/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-03R1 — restore programme semantic markers + MatchCenter activity hierarchy.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
import { PersonalProgrammeActivityIndicator } from "@/components/ui/calendar/PersonalProgrammeActivityIndicator";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";

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
    startsAt: new Date("2026-09-30T15:45:00.000Z"),
    allDay: false,
    typeLabel: overrides.sourceType,
    venue: null,
    status: "scheduled",
    deepLink: null,
    ariaLabel: overrides.title,
    ...overrides,
  };
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

function createMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
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
    home: side({ isOwnTeam: true, displayName: "FC Allschwil E1" }),
    away: side({
      isOwnTeam: false,
      displayName: "FC Basel E1",
      canonicalTeamName: "FC Basel E1",
    }),
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
  };
}

function expectRowHasMarkerAndIcon(
  container: HTMLElement,
  sourceType: PersonalProgrammeItem["sourceType"],
  paletteKey: string,
  sceIcon: string,
) {
  const marker = container.querySelector(
    `[data-programme-source="${sourceType}"][data-programme-palette="${paletteKey}"]`,
  );
  expect(marker).toBeTruthy();
  expect(container.querySelector(`[data-sce-activity-icon="${sceIcon}"]`)).toBeTruthy();
}

describe("SCE-ICONS-03R1 dashboard programme rows", () => {
  it.each([
    ["TRAINING", "training-blue", "training", "Junioren F2 Training"],
    ["MATCH", "match-green", "match", "Heimspiel vs FC X"],
    ["TOURNAMENT", "tournament-orange", "tournament", "Blitzturnier"],
  ] as const)(
    "renders semantic marker and SCE icon for %s",
    (sourceType, paletteKey, sceIcon, title) => {
      const { container } = render(
        <PersonalProgrammeAgendaRow
          item={programmeItem({ sourceType, title, typeLabel: sourceType })}
          timeLabel="09:30"
        />,
      );
      expectRowHasMarkerAndIcon(container, sourceType, paletteKey, sceIcon);
      expect(screen.getByText(title)).toBeInTheDocument();
    },
  );

  it("keeps palette marker for non-SCE programme sources without SCE icon", () => {
    const { container } = render(
      <PersonalProgrammeAgendaRow
        item={programmeItem({
          sourceType: "MEETING",
          title: "Vorstandssitzung",
          typeLabel: "Meeting",
        })}
        timeLabel="19:00"
      />,
    );
    expect(
      container.querySelector('[data-programme-palette="meeting-cyan"]'),
    ).toBeTruthy();
    expect(container.querySelector("[data-sce-activity-icon]")).toBeNull();
  });

  it("preserves cancelled status semantics", () => {
    render(
      <PersonalProgrammeAgendaRow
        item={programmeItem({
          sourceType: "TRAINING",
          title: "Abgesagtes Training",
          typeLabel: "Training",
          status: "cancelled",
        })}
        timeLabel="18:00"
      />,
    );
    expect(screen.getByText("Abgesagt")).toBeInTheDocument();
  });
});

describe("SCE-ICONS-03R1 dashboard calendar markers", () => {
  it("does not add programme agenda dot markers to calendar chips", () => {
    const { container } = render(
      <PersonalProgrammeActivityIndicator
        count={1}
        previewLabel="Training"
        primarySourceType="TRAINING"
      />,
    );
    expect(container.querySelector('[data-sce-activity-icon="training"]')).toBeTruthy();
    expect(container.querySelector(".h-2.w-2.rounded-full")).toBeNull();
    expect(readRelative("components/ui/calendar/PersonalProgrammeActivityIndicator.tsx")).not.toContain(
      "h-2 w-2",
    );
  });
});

describe("SCE-ICONS-03R1 MatchCenter hierarchy", () => {
  it("shows translated activity title above team matchup", () => {
    const match = createMatch();
    const assessment = assessMatchOperationalState(match);
    const { container } = render(
      <SpieleManagementMatchRow
        match={match}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage={false}
      />,
    );

    expect(screen.getByText("Spiel")).toBeInTheDocument();
    expect(container.querySelector(`[data-testid="matchcenter-activity-type-${match.id}"]`)).toBeTruthy();
    expect(container.querySelector(`[data-testid="matchcenter-team-matchup-${match.id}"]`)).toBeTruthy();
    expect(container.querySelector('[data-sce-activity-icon="match"]')).toBeTruthy();
    expect(screen.getByText("VS")).toBeInTheDocument();
  });

  it("keeps SCE match icon outside the home-team identity cluster", () => {
    const source = readRelative("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    const activityBlock = source.slice(
      source.indexOf("matchcenter-activity-type"),
      source.indexOf("matchcenter-team-matchup"),
    );
    expect(activityBlock).toContain("ActivitySceIcon");
    const matchupBlock = source.slice(
      source.indexOf("matchcenter-team-matchup"),
      source.indexOf("venueLine ?"),
    );
    expect(matchupBlock).not.toContain("ActivitySceIcon");
    expect(matchupBlock).toContain("ClubLogo");
  });
});
