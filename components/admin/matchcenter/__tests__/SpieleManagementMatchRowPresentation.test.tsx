/**
 * SPIELE-UX-01D / SCE-ACTIVITY-UX-01R8 — match row identity presentation.
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
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

describe("SCE-ACTIVITY-UX-01R8 — Spiele management identity", () => {
  it("MATCH AWAY — fixture, SPIEL red, Auswärts, host club - location", () => {
    renderRow(
      createMatch({
        home: side({ isOwnTeam: false, displayName: "BSC Old Boys" }),
        away: side({ isOwnTeam: true, displayName: "FC Allschwil E1" }),
        location: "Schützenmatte",
        homeAway: "AWAY",
      }),
    );

    expect(screen.getByText(/BSC Old Boys.*FC Allschwil E1/)).toBeInTheDocument();
    expect(screen.getByText("SPIEL").getAttribute("data-activity-type-pill")).toBe("match-red");
    expect(screen.getByText("Auswärts")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("BSC Old Boys - Schützenmatte")).toBeInTheDocument();
    expect(screen.queryByText("FC Allschwil - Schützenmatte")).not.toBeInTheDocument();
    expect(screen.getByText("Meisterschaft")).toBeInTheDocument();
  });

  it("MATCH HOME — SPIEL red, Eigener Verein, tenant club - location", () => {
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

    expect(screen.getByText(/FC Allschwil E1.*FC Binningen/)).toBeInTheDocument();
    expect(screen.getByText("Eigener Verein")).toHaveAttribute("data-activity-context-badge");
    expect(screen.getByText("FC Allschwil - Im Brüel")).toBeInTheDocument();
  });

  it("HOME row retains preparation checklist operational metadata", () => {
    const html = renderRowHtml(
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

    expect(html).toContain("Bereit");
    expect(html).toContain("Spielfeld");
    expect(html).toContain("Heimkabine");
    expect(html).toContain("Gastkabine");
    expect(html).toContain("Infoboard");
    expect(html).toContain("KR2");
    expect(html).toContain("O4");
    expect(html).toContain("E1");
  });

  it("AWAY row does not render home preparation checklist", () => {
    const html = renderRowHtml(createMatch({ homeAway: "AWAY" }));
    expect(html).not.toContain('aria-label="Matchvorbereitung"');
  });

  it("does not fabricate location or context when home/away unknown", () => {
    renderRow(createMatch({ homeAway: null, location: null }));
    expect(screen.queryByText("Eigener Verein")).not.toBeInTheDocument();
    expect(screen.queryByText("Auswärts")).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined|-\s*$/)).not.toBeInTheDocument();
  });

  it("row source does not add client data fetching", () => {
    const rowSource = readFileSync(
      resolve(__dirname, "../SpieleManagementMatchRow.tsx"),
      "utf8",
    );
    expect(rowSource).not.toMatch(/\buseQuery\b/);
    expect(rowSource).not.toMatch(/\bfetch\s*\(/);
  });
});
