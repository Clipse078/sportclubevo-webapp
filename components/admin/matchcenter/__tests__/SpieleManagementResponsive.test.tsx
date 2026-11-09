/**
 * SCE-DS2-04R5 — responsive composition & horizontal programme fixture rows.
 * Structural contracts (source) + behavioral layout (jsdom).
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import {
  SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
  SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR,
} from "@/lib/sporting-activity-presentation/canonical/activity-card-full-width-list-contract";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

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
    id: "match-home-responsive",
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
      pitchCode: "KR2",
      homeDressingRoomCode: "O4",
      awayDressingRoomCode: "E1",
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: false,
      wochenplanVisible: false,
    },
    ...overrides,
  };
}

function renderHomeRow(match = createMatch()) {
  const assessment = assessMatchOperationalState(match);
  return render(
    <SpieleManagementMatchRow
      match={match}
      assessment={assessment}
      locale="de-CH"
      timezone="Europe/Zurich"
      tenantClubName="FC Allschwil"
      canManage
    />,
  );
}

describe("SCE-DS2-04R5 — workspace responsive structural contract", () => {
  it("delays side-by-side main+rail until wide desktop breakpoint", () => {
    const workspace = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    const layout = readSource("components/admin/matchcenter/spiele-management-layout.ts");

    expect(layout).toContain("min-[105rem]:grid-cols-[minmax(0,1fr)_17.5rem]");
    expect(workspace).toContain("SPIELE_WORKSPACE_MAIN_RAIL_GRID");
    expect(workspace).not.toMatch(/xl:grid-cols-\[minmax\(0,1fr\)_17\.5rem\]/);
    expect(workspace).toContain('data-testid="spiele-management-rail"');
  });

  it("programme list uses full-width horizontal card list container (no multi-column card grid)", () => {
    const upcoming = readSource("components/admin/matchcenter/SpieleManagementUpcomingList.tsx");
    expect(upcoming).toContain("sceActivityCardListContainerProps");
    expect(upcoming).toContain("{...sceActivityCardListContainerProps()}");
    expect(upcoming).not.toMatch(/sm:grid-cols-2 xl:grid-cols-3/);
  });

  it("match row composes SceMatchCard programme fixture (legacy PreparationColumn removed)", () => {
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toContain("SceMatchCard");
    expect(row).toContain('listRowPresentation="programme-fixture"');
    expect(row).toContain("SceMatchCardCollapsibleOperationalDetails");
    expect(row).not.toContain("PreparationColumn");
    expect(row).not.toContain("SPIELE_MATCH_ROW_INTERMEDIATE_GRID");
  });

  it("right rail calendar and filters remain mounted in workspace", () => {
    const workspace = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    expect(workspace).toContain("SpieleManagementMonthCalendar");
    expect(workspace).toContain("SpieleManagementFilterRail");
    expect(workspace).not.toContain("SpieleManagementQuickAccess");
  });

  it("collapsible operational details default collapsed at component level", () => {
    const collapsible = readSource(
      "components/sporting-activity/SceMatchCardCollapsibleOperationalDetails.tsx",
    );
    expect(collapsible).toContain("defaultExpanded = false");
  });

  it("suppresses redundant away readiness pill when Auswärtsspiel label suffices", () => {
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toContain("shouldShowReadinessPill");
    expect(row).toContain('statusLabel === "Auswärtsspiel"');
  });
});

describe("SCE-DS2-04R5 — horizontal fixture row behavior", () => {
  it("marks programme shell and row as horizontal full-width", () => {
    renderHomeRow();
    const row = screen.getByTestId("matchcenter-spielplanung-row-match-home-responsive");
    expect(row).toHaveAttribute(
      SCE_ACTIVITY_CARD_LIST_LAYOUT_ATTR,
      SCE_ACTIVITY_CARD_FULL_WIDTH_LAYOUT_MARKER,
    );
    expect(row).toHaveAttribute("data-sce-matchcenter-composition", "collapsible-card-operations-below");
    expect(within(row).getByTestId("matchcenter-sce-match-match-home-responsive")).toHaveAttribute(
      "data-surface",
      "list-row",
    );
  });

  it("aligns fixture metadata and home/away matchup on the card", () => {
    renderHomeRow(
      createMatch({
        away: side({
          isOwnTeam: false,
          displayName: "FC Muttenz mit sehr langem Vereinsnamen",
        }),
      }),
    );
    const card = screen.getByTestId("matchcenter-sce-match-match-home-responsive");
    const fixture = within(card).getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-side="home"]')?.textContent).toContain(
      "FC Allschwil E1",
    );
    expect(fixture.querySelector('[data-sce-match-side="away"]')?.textContent).toContain(
      "FC Muttenz mit sehr langem Vereinsnamen",
    );
    expect(within(card).getByTestId("sce-match-location")).toHaveTextContent("Im Brüel");
    expect(within(card).getByTestId("sce-match-list-row-team-context")).toHaveTextContent(
      "Meisterschaft",
    );
  });

  it("reserves trailing space on narrow viewports so team names stay readable beside menu", () => {
    const collapsible = readSource(
      "components/sporting-activity/SceMatchCardCollapsibleOperationalDetails.tsx",
    );
    expect(collapsible).toContain("max-md:pr-8");
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toContain("min-w-0");
    expect(row).toContain("SpieleMatchRowContextMenu");
  });

  it("keeps preparation accordion collapsed by default and hides checklist fields", () => {
    renderHomeRow();
    expect(screen.getByTestId("matchcenter-collapsible-match-home-responsive-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Spielfeld")).not.toBeInTheDocument();
    expect(screen.getByText("Bereit")).toBeInTheDocument();
  });

  it("expands preparation details and readiness panel on activation", async () => {
    const user = userEvent.setup();
    renderHomeRow();

    await user.click(screen.getByTestId("matchcenter-collapsible-match-home-responsive-toggle"));
    expect(screen.getByTestId("matchcenter-collapsible-match-home-responsive-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
    expect(screen.getByText("KR2")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-open-points-panel")).toBeInTheDocument();
  });

  it("keeps three-dot action menu independent from accordion toggle", async () => {
    const user = userEvent.setup();
    renderHomeRow();
    const menu = screen.getByTestId("spiele-row-menu-match-home-responsive");
    const toggle = screen.getByTestId("matchcenter-collapsible-match-home-responsive-toggle");
    expect(menu).toBeInTheDocument();
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toContainElement(menu);

    await user.click(toggle);
    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
    expect(menu).toBeInTheDocument();
  });

  it("supports keyboard expansion via Enter on the chevron control", async () => {
    const user = userEvent.setup();
    renderHomeRow();
    const toggle = screen.getByTestId("matchcenter-collapsible-match-home-responsive-toggle");
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
  });

  it("away fixtures use stacked composition without home preparation accordion", () => {
    const awayMatch = createMatch({
      id: "match-away-responsive",
      homeAway: "AWAY",
      home: side({ isOwnTeam: false, displayName: "FC Basel E1" }),
      away: side({ isOwnTeam: true }),
      location: "St. Jakob-Park",
    });
    const assessment = assessMatchOperationalState(awayMatch);
    render(
      <SpieleManagementMatchRow
        match={awayMatch}
        assessment={assessment}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        canManage
      />,
    );
    const row = screen.getByTestId("matchcenter-spielplanung-row-match-away-responsive");
    expect(row).toHaveAttribute("data-sce-matchcenter-composition", "stacked-card-operations-below");
    expect(screen.queryByTestId("matchcenter-collapsible-match-away-responsive")).not.toBeInTheDocument();
    expect(screen.queryByText("Spielfeld")).not.toBeInTheDocument();
  });
});
