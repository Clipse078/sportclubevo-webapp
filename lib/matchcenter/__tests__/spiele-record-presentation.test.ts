import { describe, expect, it } from "vitest";
import type { MatchcenterMatchDetail } from "../types";
import {
  assessSpieleRecordOperationalState,
  resolveHomeAwaySemanticLabel,
  resolveSpieleRecordSourceLabel,
} from "../spiele-record-presentation";
import { buildMatchWochenplanerHref } from "../wochenplaner-deep-links";

function createMatch(
  overrides: Partial<MatchcenterMatchDetail> = {},
): MatchcenterMatchDetail {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    seasonId: "season-1",
    type: "MATCH",
    title: "FC A – FC B",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-09-19T16:00:00.000Z"),
    endAt: new Date("2026-09-19T18:00:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-09-19T18:00:00.000Z"),
    location: "Kunstrasen",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 1,
      providerTeamName: "FC A",
      canonicalTeamId: "t1",
      canonicalTeamName: "FC A",
      displayName: "FC A",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 2,
      providerTeamName: "FC B",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC B",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "1",
      provider: "SFV",
      externalMatchId: 1,
      externalSeasonId: 1,
      matchNumber: 1,
    },
    synchronization: {
      eventLastSyncedAt: new Date("2026-08-01T10:00:00.000Z"),
      mappingLastSyncedAt: null,
      detailSyncedAt: new Date("2026-08-01T11:00:00.000Z"),
      providerMatchState: 1,
      providerMatchStateName: "Geplant",
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

describe("spiele-record-presentation", () => {
  it("labels SFV source", () => {
    expect(resolveSpieleRecordSourceLabel(createMatch())).toBe("SFV");
  });

  it("labels manual source", () => {
    expect(
      resolveSpieleRecordSourceLabel(
        createMatch({
          source: {
            eventSource: "MANUAL",
            externalSource: null,
            externalSourceId: null,
            provider: null,
            externalMatchId: null,
            externalSeasonId: null,
            matchNumber: null,
          },
        }),
      ),
    ).toBe("Manuell");
  });

  it("assesses HOME open points when allocations missing", () => {
    const assessment = assessSpieleRecordOperationalState(createMatch(), new Date("2026-09-01T12:00:00.000Z"));
    expect(assessment.status).toBe("OPEN");
    expect(assessment.actionCount).toBeGreaterThan(0);
  });

  it("assesses AWAY without home facility requirements", () => {
    const assessment = assessSpieleRecordOperationalState(
      createMatch({
        homeAway: "AWAY",
        away: {
          providerTeamId: 1,
          providerTeamName: "FC A",
          canonicalTeamId: "t1",
          canonicalTeamName: "FC A",
          displayName: "FC A",
          resolution: "RESOLVED",
          isOwnTeam: true,
        },
        home: {
          providerTeamId: 2,
          providerTeamName: "FC B",
          canonicalTeamId: null,
          canonicalTeamName: null,
          displayName: "FC B",
          resolution: "UNRESOLVED",
          isOwnTeam: false,
        },
      }),
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(assessment.status).toBe("AWAY");
    expect(assessment.actions.some((a) => a.key === "pitch")).toBe(false);
  });

  it("resolves home/away semantic labels", () => {
    expect(resolveHomeAwaySemanticLabel("HOME")).toBe("Heimspiel");
    expect(resolveHomeAwaySemanticLabel("AWAY")).toBe("Auswärtsspiel");
  });

  it("builds wochenplaner deep link with day and team", () => {
    const href = buildMatchWochenplanerHref({
      startAt: new Date("2026-09-19T16:00:00.000Z"),
      teamId: "team-1",
      timezone: "Europe/Zurich",
    });
    expect(href).toContain("typ=spiele");
    expect(href).toContain("team=team-1");
  });
});
