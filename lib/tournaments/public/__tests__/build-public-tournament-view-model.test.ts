import { describe, expect, it } from "vitest";
import type { PlanungDomainSnapshot } from "@/lib/tournaments/planung/build-planung-view-model";
import { buildPublicTournamentViewModel } from "../build-public-tournament-view-model";

const TZ = "Europe/Zurich";

function snapshot(partial: Partial<PlanungDomainSnapshot>): PlanungDomainSnapshot {
  return {
    tournamentId: "t1",
    ownership: "TENANT_ORGANISED",
    timezone: TZ,
    windowStartUtc: "2026-08-01T08:00:00.000Z",
    windowEndUtc: "2026-08-01T12:00:00.000Z",
    scheduleVersionId: "sv1",
    scheduleRevision: 3,
    schedulingConfig: {
      matchDurationMinutes: 20,
      transitionMinutes: 5,
      minRestMinutes: 10,
    },
    pitches: [{ id: "p1", displayOrder: 0, label: "Feld 1" }],
    breaks: [],
    fixtures: [
      {
        id: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        tournamentGroupId: "g1",
        phaseType: "GROUP_MIX",
        sideAParticipantId: "a",
        sideBParticipantId: "b",
        sides: [],
        phaseLabel: "Gruppe",
        groupLabel: "Gruppe A",
      },
    ],
    assignments: [
      {
        id: "as1",
        fixtureId: "f1",
        tournamentPitchId: "p1",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T08:20:00.000Z",
        scheduleLockDimension: "TIME",
      },
    ],
    participants: [
      { participantId: "a", displayName: "FCA F2 Rot", crestUrl: null, accessibleLabel: "FCA F2 Rot" },
      { participantId: "b", displayName: "FCA F2 Blau", crestUrl: null, accessibleLabel: "FCA F2 Blau" },
    ],
    participantCount: 2,
    fixtureCount: 1,
    feasibility: null,
    smartTiming: null,
    optimisation: null,
    fixtureResults: [
      {
        fixtureId: "f1",
        state: "COMPLETED",
        scoreSideA: 2,
        scoreSideB: 1,
        winnerParticipantId: "a",
        revision: 9,
      },
    ],
    groups: [
      { id: "g1", label: "Gruppe A", participantIds: ["a", "b"] },
    ],
    rankingConfiguration: {
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"],
    },
    ...partial,
  };
}

describe("buildPublicTournamentViewModel", () => {
  it("maps tournament-local participants and completed scores without internal fields", () => {
    const vm = buildPublicTournamentViewModel({
      tenantKey: "fc-allschwil",
      header: {
        id: "t1",
        title: "Hallenturnier",
        description: null,
        location: "Halle",
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T12:00:00.000Z",
        meetingTime: null,
        organizerName: "FC Allschwil",
        organizerLogoUrl: null,
        competitionLabel: null,
        status: "SCHEDULED",
        season: null,
      },
      publication: {
        websiteVisible: true,
        homepageVisible: false,
        wochenplanVisible: true,
        teamPageVisible: false,
      },
      snapshot: snapshot({}),
    });

    expect(vm.publicPath).toBe("/public/fc-allschwil/turniere/t1");
    expect(vm.participants.map((p) => p.displayName)).toEqual(["FCA F2 Rot", "FCA F2 Blau"]);
    const fixture = vm.scheduleSections[0]?.entries[0];
    expect(fixture?.kind).toBe("FIXTURE");
    if (fixture?.kind === "FIXTURE") {
      expect(fixture.result).toEqual({ state: "COMPLETED", scoreSideA: 2, scoreSideB: 1 });
      expect(fixture).not.toHaveProperty("revision");
      expect(fixture).not.toHaveProperty("lockDimension");
    }
    expect(vm.groupStandings[0]?.rows.length).toBeGreaterThan(0);
    expect(vm.spielplan.fixtures.length).toBeGreaterThan(0);
    expect(vm.spielplan.fixtures[0]?.result).toEqual({ scoreSideA: 2, scoreSideB: 1 });
    expect(JSON.stringify(vm)).not.toMatch(/revision|scheduleVersion|audit|email|phone/i);
  });

  it("shows qualification placeholders without fabricating participant names", () => {
    const vm = buildPublicTournamentViewModel({
      tenantKey: "fc-allschwil",
      header: {
        id: "t1",
        title: "KO",
        description: null,
        location: null,
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: null,
        meetingTime: null,
        organizerName: null,
        organizerLogoUrl: null,
        competitionLabel: null,
        status: "SCHEDULED",
        season: null,
      },
      publication: {
        websiteVisible: true,
        homepageVisible: false,
        wochenplanVisible: false,
        teamPageVisible: false,
      },
      snapshot: snapshot({
        assignments: [
          {
            id: "as1",
            fixtureId: "f-ko",
            tournamentPitchId: "p1",
            startAt: "2026-08-01T09:00:00.000Z",
            endAt: "2026-08-01T09:20:00.000Z",
            scheduleLockDimension: null,
          },
        ],
        fixtures: [
          {
            id: "f-ko",
            stageKey: "KO",
            roundIndex: 1,
            slotIndexInRound: 0,
            tournamentGroupId: null,
            phaseType: "KNOCKOUT",
            sideAParticipantId: null,
            sideBParticipantId: null,
            phaseLabel: "Halbfinale",
            groupLabel: null,
            sides: [
              {
                side: "A",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "WINNER_OF_FIXTURE",
                  rank: null,
                  sourceGroupLabel: null,
                  sourceFixture: { roundIndex: 0, slotIndexInRound: 0 },
                },
              },
              {
                side: "B",
                sourceType: "QUALIFICATION_REFERENCE",
                participantId: null,
                qualification: {
                  sourceType: "GROUP_RANK",
                  rank: 2,
                  sourceGroupLabel: "Gruppe B",
                  sourceFixture: null,
                },
              },
            ],
          },
        ],
        fixtureResults: [],
        groups: [],
      }),
    });

    const entry = vm.mobileTimeline.find((e) => e.kind === "FIXTURE");
    expect(entry?.kind).toBe("FIXTURE");
    if (entry?.kind === "FIXTURE") {
      expect(entry.sideA.isPlaceholder).toBe(true);
      expect(entry.sideB.label).toMatch(/Gruppe B/);
      expect(entry.result).toBeNull();
    }
  });
});
