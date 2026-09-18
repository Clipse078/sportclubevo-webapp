/**
 * SPIELE-UX-02A — unknown provider kickoff presentation + operational end guard.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { parseSfvMatchDateTime } from "@/lib/integrations/sfv/sync/provider-time";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "@/lib/match/defaults";
import {
  matchTimingToOperationalInput,
  resolveMatchOperationalInterval,
} from "@/lib/match/resolve-match-operational-interval";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import {
  formatSpieleKickoffForMatch,
  resolveSpieleOperationalEndTime,
} from "@/lib/matchcenter/management-view";
import {
  formatSpieleKickoffPresentation,
  formatSpieleOperationalEndPresentation,
} from "@/lib/matchcenter/spiele-record-presentation";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";

function side(overrides: Partial<MatchcenterSide> = {}): MatchcenterSide {
  return {
    providerTeamId: 1,
    providerTeamName: "FC Allschwil D3",
    canonicalTeamId: "team-1",
    canonicalTeamName: "Junioren D-9 D3",
    displayName: "Junioren D-9 D3",
    resolution: "RESOLVED",
    isOwnTeam: true,
    ...overrides,
  };
}

function createMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  const startAt = parseSfvMatchDateTime("2026-09-19T19:45:00");
  const operationalEndAt = new Date(
    startAt.getTime() + SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES * 60_000,
  );
  return {
    id: "match-arlesheim",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "Junioren D-9 — vs FC Arlesheim c",
    description: null,
    status: "SCHEDULED",
    startAt,
    kickoffKnown: true,
    endAt: null,
    operationalEndAtOverride: null,
    operationalEndAt,
    location: null,
    competitionLabel: "Junioren D-9",
    homeAway: "AWAY",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({ isOwnTeam: false, displayName: "FC Arlesheim c" }),
    away: side({ isOwnTeam: true }),
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "4360612",
      provider: "SFV",
      externalMatchId: 4360612,
      externalSeasonId: 2027,
      matchNumber: null,
    },
    synchronization: {
      eventLastSyncedAt: null,
      mappingLastSyncedAt: null,
      detailSyncedAt: null,
      providerMatchState: 4,
      providerMatchStateName: "Null zu Null - Null Punkte",
    },
    operational: {
      pitchCode: null,
      homeDressingRoomCode: null,
      awayDressingRoomCode: null,
      meetingTime: null,
      remarks: null,
    },
    visibility: {
      websiteVisible: false,
      infoboardVisible: false,
      homepageVisible: false,
      wochenplanVisible: false,
    },
    ...overrides,
  };
}

describe("SPIELE-UX-02A — match kickoff presentation", () => {
  it("A. known kickoff 19:45 remains 19:45", () => {
    const match = createMatch();
    expect(formatSpieleKickoffForMatch(match, "de-CH", "Europe/Zurich")).toBe("19:45");
  });

  it("C. unknown/TBD SFV midnight kickoff renders Zeit offen, not 00:00", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    const match = createMatch({
      startAt,
      kickoffKnown: false,
      operationalEndAt: startAt,
    });
    expect(formatSpieleKickoffPresentation(match, "de-CH", "Europe/Zurich")).toBe("Zeit offen");
    expect(formatSpieleKickoffForMatch(match, "de-CH", "Europe/Zurich")).toBe("Zeit offen");
  });

  it("D. unknown kickoff does not synthesize operational end for display", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    const match = createMatch({
      startAt,
      kickoffKnown: false,
      operationalEndAt: startAt,
    });
    expect(resolveSpieleOperationalEndTime(match)).toBeNull();
    expect(formatSpieleOperationalEndPresentation(match, "de-CH", "Europe/Zurich")).toBeNull();
  });

  it("E. known kickoff + platform duration still derives operational end", () => {
    const interval = resolveMatchOperationalInterval(
      matchTimingToOperationalInput(
        {
          startAt: parseSfvMatchDateTime("2026-09-19T19:45:00"),
          endAt: null,
          kickoffKnown: true,
        },
        undefined,
      ),
    );
    expect(interval.isDerived).toBe(true);
    expect(interval.durationMinutes).toBe(120);
    expect(
      new Intl.DateTimeFormat("de-CH", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Zurich",
      }).format(interval.endAt),
    ).toBe("21:45");
  });

  it("unknown kickoff skips configured duration derivation", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    const interval = resolveMatchOperationalInterval(
      matchTimingToOperationalInput({
        startAt,
        endAt: null,
        kickoffKnown: false,
      }),
    );
    expect(interval.isDerived).toBe(false);
    expect(interval.durationMinutes).toBe(0);
    expect(interval.endAt.getTime()).toBe(startAt.getTime());
  });

  it("G. management overview row shows Zeit offen without 02:00 end", () => {
    const startAt = parseSfvMatchDateTime("2026-09-19T00:00:00");
    const match = createMatch({
      startAt,
      kickoffKnown: false,
      operationalEndAt: startAt,
    });
    const html = renderToStaticMarkup(
      <SpieleManagementMatchRow
        match={match}
        assessment={assessMatchOperationalState(match)}
        locale="de-CH"
        timezone="Europe/Zurich"
        canManage={false}
      />,
    );
    expect(html).toContain("Zeit offen");
    expect(html).not.toContain(">00:00<");
    expect(html).not.toContain(">02:00<");
  });
});
