/**
 * SPIELE-UX-01D — responsive match row presentation (dedup + density).
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";

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

function renderRow(match: MatchcenterMatchSummary) {
  const assessment = assessMatchOperationalState(match);
  return renderToStaticMarkup(
    <SpieleManagementMatchRow
      match={match}
      assessment={assessment}
      locale="de-CH"
      timezone="Europe/Zurich"
      canManage={false}
    />,
  );
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

describe("SPIELE-UX-01D — match row presentation", () => {
  it("A. AWAY intermediate status renders Auswärtsspiel exactly once (no readiness duplicate)", () => {
    const html = renderRow(createMatch({ homeAway: "AWAY" }));
    const start = html.indexOf('data-testid="matchcenter-action-match-away-1"');
    const actionBlock = html.slice(start, html.indexOf("</article>", start));
    expect(countOccurrences(actionBlock, "Auswärtsspiel")).toBe(1);
  });

  it("B. AWAY row surfaces venue once in the operational column (not duplicated in status)", () => {
    const venue = "St. Jakob-Park, Basel";
    const html = renderRow(createMatch({ homeAway: "AWAY", location: venue }));
    expect(countOccurrences(html, venue)).toBeLessThanOrEqual(2);
    expect(html).not.toContain('aria-label="Matchvorbereitung"');
  });

  it("C. HOME row retains preparation checklist labels and readiness", () => {
    const html = renderRow(
      createMatch({
        id: "match-home-1",
        homeAway: "HOME",
        home: side({ isOwnTeam: true }),
        away: side({
          isOwnTeam: false,
          displayName: "FC Basel E1",
          canonicalTeamName: "FC Basel E1",
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

    expect(html).toContain("Heimspiel");
    expect(html).toContain("Bereit");
    expect(html).toContain("Spielfeld");
    expect(html).toContain("Heimkabine");
    expect(html).toContain("Gastkabine");
    expect(html).toContain("Infoboard");
    expect(html).toContain("KR2");
    expect(html).toContain("O4");
    expect(html).toContain("E1");
  });

  it("D. match identity (teams + kickoff test id) remains stable", () => {
    const html = renderRow(createMatch());
    expect(html).toContain('data-testid="matchcenter-spielplanung-row-match-away-1"');
    expect(html).toContain("FC Allschwil E1");
    expect(html).toContain("FC Basel E1");
  });

  it("E. row source does not add client data fetching", () => {
    const rowSource = readFileSync(
      resolve(__dirname, "../SpieleManagementMatchRow.tsx"),
      "utf8",
    );
    expect(rowSource).not.toMatch(/\buseQuery\b/);
    expect(rowSource).not.toMatch(/\bfetch\s*\(/);
  });
});
