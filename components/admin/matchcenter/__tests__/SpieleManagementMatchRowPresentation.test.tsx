/**
 * SPIELE-UX-01D / SCE-UI-ROLLOUT-01D — match row canonical SceMatchCard presentation.
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";

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
    id: "match-away-1",
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
    homeAway: "AWAY",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({ isOwnTeam: false, displayName: "FC Basel E1" }),
    away: side({ isOwnTeam: true, displayName: "FC Allschwil E1" }),
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

function renderRow(match: MatchcenterMatchSummary, tenantClubName = "FC Allschwil") {
  const assessment = assessMatchOperationalState(match);
  return render(
    <SpieleManagementMatchRow
      match={match}
      assessment={assessment}
      locale="de-CH"
      timezone="Europe/Zurich"
      tenantClubName={tenantClubName}
      canManage={false}
    />,
  );
}

function renderRowHtml(match: MatchcenterMatchSummary) {
  const assessment = assessMatchOperationalState(match);
  return renderToStaticMarkup(
    <SpieleManagementMatchRow
      match={match}
      assessment={assessment}
      locale="de-CH"
      timezone="Europe/Zurich"
      tenantClubName="FC Allschwil"
      canManage={false}
    />,
  );
}

describe("SCE-UI-ROLLOUT-01D — Spiele management canonical match card", () => {
  it("MATCH AWAY — home left / away right, Auswärts context, location on card", () => {
    renderRow(
      createMatch({
        home: side({ isOwnTeam: false, displayName: "BSC Old Boys" }),
        away: side({ isOwnTeam: true, displayName: "FC Allschwil E1" }),
        location: "Schützenmatte",
        homeAway: "AWAY",
      }),
    );

    const card = screen.getByTestId("matchcenter-sce-match-match-away-1");
    const fixture = within(card).getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-side="home"]')?.textContent).toContain(
      "BSC Old Boys",
    );
    expect(fixture.querySelector('[data-sce-match-side="away"]')?.textContent).toContain(
      "FC Allschwil E1",
    );
    expect(within(card).getByText("Auswärtsspiel", { selector: ".sr-only" })).toBeInTheDocument();
    expect(within(card).getByTestId("sce-match-location")).toHaveTextContent("Schützenmatte");
    expect(within(card).getByTestId("sce-match-list-row-team-context")).toHaveTextContent(
      "Meisterschaft",
    );
  });

  it("MATCH HOME — Heim context and canonical fixture", () => {
    renderRow(
      createMatch({
        id: "match-home-1",
        homeAway: "HOME",
        home: side({ isOwnTeam: true, displayName: "FC Allschwil E1" }),
        away: side({
          isOwnTeam: false,
          displayName: "FC Binningen",
        }),
        location: "Im Brüel",
      }),
    );

    const card = screen.getByTestId("matchcenter-sce-match-match-home-1");
    expect(within(card).getByText("Heimspiel", { selector: ".sr-only" })).toBeInTheDocument();
    expect(within(card).getByTestId("sce-match-fixture").textContent).toContain("FC Binningen");
  });

  it("HOME row collapses preparation checklist by default but keeps compact readiness", () => {
    renderRow(
      createMatch({
        id: "match-home-1",
        homeAway: "HOME",
        home: side({ isOwnTeam: true }),
        away: side({
          isOwnTeam: false,
          displayName: "FC Basel E1",
        }),
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
      }),
    );

    const row = screen.getByTestId("matchcenter-spielplanung-row-match-home-1");
    expect(row).toHaveAttribute("data-sce-matchcenter-composition", "collapsible-card-operations-below");
    expect(screen.getByText("Bereit")).toBeInTheDocument();
    expect(screen.queryByText("Spielfeld")).not.toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-collapsible-match-home-1-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("HOME row expands preparation checklist on chevron activation", async () => {
    const user = userEvent.setup();
    renderRow(
      createMatch({
        id: "match-home-1",
        homeAway: "HOME",
        home: side({ isOwnTeam: true }),
        away: side({
          isOwnTeam: false,
          displayName: "FC Basel E1",
        }),
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
      }),
    );

    await user.click(screen.getByTestId("matchcenter-collapsible-match-home-1-toggle"));
    expect(screen.getByText("Spielfeld")).toBeInTheDocument();
    expect(screen.getByText("KR2")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-open-points-panel")).toBeInTheDocument();
  });

  it("AWAY row does not render home preparation checklist", () => {
    const html = renderRowHtml(createMatch({ homeAway: "AWAY" }));
    expect(html).not.toContain('aria-label="Matchvorbereitung"');
  });

  it("does not fabricate tenant context when home/away unknown", () => {
    renderRow(createMatch({ homeAway: null, location: null }));
    expect(screen.queryByTestId("sce-match-context-heim")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sce-match-context-auswaerts")).not.toBeInTheDocument();
  });

  it("composes full-width programme shell with collapsible operational region", () => {
    renderRow(createMatch({ id: "match-home-1", homeAway: "HOME" }));
    const row = screen.getByTestId("matchcenter-spielplanung-row-match-home-1");
    expect(row).toHaveAttribute("data-sce-matchcenter-composition", "collapsible-card-operations-below");
    expect(row).toHaveAttribute("data-sce-programme-activity-card-shell");
    expect(within(row).getByTestId("matchcenter-sce-match-match-home-1")).toHaveAttribute(
      "data-surface",
      "list-row",
    );
    expect(within(row).getByTestId("matchcenter-collapsible-match-home-1")).toBeInTheDocument();
  });

  it("keeps three-dot context menu separate from collapsible toggle", () => {
    renderRow(createMatch({ id: "match-home-1", homeAway: "HOME" }));
    expect(screen.getByTestId("spiele-row-menu-match-home-1")).toBeInTheDocument();
    expect(screen.getByTestId("matchcenter-collapsible-match-home-1-toggle")).toBeInTheDocument();
  });

  it("row source does not add client data fetching", () => {
    const rowSource = readFileSync(
      resolve(__dirname, "../SpieleManagementMatchRow.tsx"),
      "utf8",
    );
    expect(rowSource).not.toMatch(/\buseQuery\b/);
    expect(rowSource).not.toMatch(/\bfetch\s*\(/);
    expect(rowSource).toContain("SceMatchCard");
    expect(rowSource).not.toContain("SpieleManagementMatchIdentity");
  });
});
