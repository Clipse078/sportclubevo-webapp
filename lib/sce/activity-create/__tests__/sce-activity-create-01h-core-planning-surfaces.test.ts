import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import {
  formatSceActivityLocationHierarchy,
  resolveSceMatchPresentation,
  resolveSceTournamentPresentation,
} from "@/lib/sporting-activity-presentation/canonical";
import { resolveSceTrainingPresentationFromManagementRow } from "@/lib/sporting-activity-presentation/canonical/adapters/training-management";
import { resolveSceTrainingPresentationFromSessionManagementRow } from "@/lib/sporting-activity-presentation/canonical/adapters/training-session-management";
import { resolveSceTrainingPresentationFromWeekplannerTraining } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-training";
import { resolveSceMatchPresentationFromWeekplannerMatch } from "@/lib/sporting-activity-presentation/canonical/adapters/weekplanner-match";
import type { ClubEvent } from "@/lib/events/club-events-service";
import { applyClubEventOrganisationalAudienceTestDefaults } from "@/lib/events/club-event-test-defaults";
import { resolveSceClubEventPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/club-event";
import type { TournamentDto } from "@/lib/tournaments/types";
import { resolvePlannerSportingActivityTypePresentation } from "@/lib/planning-hub/planner-sporting-activity-type-label";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import { SCE_ACTIVITY_CREATE_MENU_ENTRIES } from "../activity-create-menu-config";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const CORE_PLANNING_SURFACES = [
  "app/(admin)/dashboard/planner/week/page.tsx",
  "app/(admin)/dashboard/training/page.tsx",
  "app/(admin)/dashboard/matchcenter/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/page.tsx",
] as const;

const WORLD_ACTIVITY_CARD_CONSUMERS = [
  "components/admin/matchcenter/SpieleManagementMatchRow.tsx",
  "components/admin/matchcenter/SpieleManagementResultRow.tsx",
  "components/admin/tournamentcenter/TurniereManagementRow.tsx",
  "components/admin/veranstaltungen/VeranstaltungListRow.tsx",
  "components/admin/training/TrainingSeriesManagementRow.tsx",
  "components/admin/training/TrainingSessionManagementRow.tsx",
  "components/admin/planner/WeekplannerMatchIdentityCard.tsx",
  "components/admin/planner/WeekplannerTrainingIdentityCard.tsx",
  "components/admin/planner/WeekplannerTournamentIdentityCard.tsx",
  "components/admin/planning-hub/PlanningHubActivityBlock.tsx",
  "components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx",
] as const;

function side(partial: Partial<MatchcenterSide> & Pick<MatchcenterSide, "displayName">): MatchcenterSide {
  return {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    resolution: "RESOLVED",
    isOwnTeam: false,
    externalLogoUrl: null,
    ...partial,
  };
}

describe("SCE-ACTIVITY-CREATE-01H — core planning surfaces adoption", () => {
  describe("surface inventory — canonical create + presentation path", () => {
    it("eligible core surfaces wire SceActivityCreateMenu from 01G", () => {
      for (const file of CORE_PLANNING_SURFACES) {
        const source = read(file);
        expect(source, file).toContain("SceActivityCreateMenu");
        expect(source, file).not.toMatch(/Training erstellen|Spiel erstellen|Turnier erstellen|Veranstaltung erstellen/);
      }
    });

    it("management rows consume World Activity Card family where list density applies", () => {
      for (const file of WORLD_ACTIVITY_CARD_CONSUMERS) {
        const source = read(file);
        const usesCanonicalCard =
          source.includes("SceMatchCard") ||
          source.includes("SceTrainingCard") ||
          source.includes("SceTournamentCard") ||
          source.includes("SceClubEventCard") ||
          source.includes("ActivityTypePill");
        expect(usesCanonicalCard, file).toBe(true);
      }
    });

    it("documents 01H adoption architecture", () => {
      expect(existsSync(join(root, "docs/roadmap/SCE-ACTIVITY-CREATE-01H.md"))).toBe(true);
    });
  });

  describe("semantic activity language", () => {
    it("maps planner types to canonical textual labels", () => {
      expect(resolvePlannerSportingActivityTypePresentation("MATCH")).toEqual({
        kind: "MATCH",
        label: "SPIEL",
      });
      expect(resolvePlannerSportingActivityTypePresentation("TRAINING")).toEqual({
        kind: "TRAINING",
        label: "TRAINING",
      });
      expect(resolvePlannerSportingActivityTypePresentation("TOURNAMENT")).toEqual({
        kind: "TOURNAMENT",
        label: "TURNIER",
      });
    });

    it("preserves 01G create menu accent tokens", () => {
      expect(SCE_ACTIVITY_CREATE_MENU_ENTRIES.map((e) => e.accentToken)).toEqual([
        "training-blue",
        "match-red",
        "tournament-orange",
        "club-event-violet",
      ]);
    });
  });

  describe("cross-surface consistency — MATCH", () => {
    const awayLocation = "Sportzentrum Tannenbrunn, Sissach - 2";
    const match: MatchcenterMatchSummary = {
      id: "match-away-sissach",
      tenantId: "tenant-fca",
      teamId: "team-ff14",
      teamSeasonId: "ts-1",
      seasonId: "season-2026-2027",
      type: "MATCH",
      title: "SV Sissach – Juniorinnen FF-14",
      description: null,
      status: "SCHEDULED",
      startAt: new Date("2026-10-13T14:00:00.000Z"),
      kickoffKnown: true,
      endAt: new Date("2026-10-13T16:00:00.000Z"),
      operationalEndAtOverride: null,
      operationalEndAt: new Date("2026-10-13T16:00:00.000Z"),
      location: awayLocation,
      competitionLabel: "Meisterschaft",
      homeAway: "AWAY",
      resultLabel: null,
      intermediateResultLabel: null,
      scoreHome: null,
      scoreAway: null,
      home: side({ displayName: "SV Sissach" }),
      away: side({ displayName: "Juniorinnen FF-14", isOwnTeam: true }),
      source: {
        eventSource: "SFV",
        externalSource: "SFV",
        externalSourceId: "1",
        provider: "SFV",
        externalMatchId: 99,
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
        infoboardVisible: true,
        homepageVisible: false,
        wochenplanVisible: true,
        trainingsplanVisible: false,
        teamPageVisible: true,
      },
      reviewStage: "APPROVED",
    } as MatchcenterMatchSummary;

    it("keeps authoritative away location intact on management presentation", () => {
      const model = resolveSceMatchPresentation({
        match,
        tenantClubName: "FC Allschwil",
        timezone: "Europe/Zurich",
      });
      expect(formatSceActivityLocationHierarchy(model.location)).toContain("Sissach - 2");
      expect(model.fixture?.home.displayName).toBe("SV Sissach");
      expect(model.fixture?.away.displayName).toBe("Juniorinnen FF-14");
    });

    it("aligns weekplanner match adapter home-left fixture identity", () => {
      const plannerModel = resolveSceMatchPresentationFromWeekplannerMatch(
        {
          id: "match:1",
          tenantId: "t1",
          type: "MATCH",
          startAt: match.startAt,
          endAt: match.endAt!,
          canonicalStartAt: match.startAt,
          canonicalEndAt: match.endAt!,
          timeOverridden: false,
          title: match.title,
          teamNames: ["FC Allschwil 1"],
          teamSeasonId: "ts-1",
          eventId: match.id,
          opponentName: "SV Sissach",
          eventSource: "MANUAL",
          homeSide: { displayName: "FC Allschwil 1", logoUrl: null },
          awaySide: { displayName: "SV Sissach", logoUrl: null },
          homeAway: "HOME",
          conflicts: [],
          pitchAllocations: [],
          dressingRoomAllocations: [],
          canonicalPitchAllocations: [],
          canonicalDressingRoomAllocations: [],
          awayDressingRoomAllocations: [],
          pitchOverridden: false,
          dressingRoomOverridden: false,
        },
        { timezone: "Europe/Zurich" },
      );
      expect(plannerModel.fixture?.home.displayName).toBe("FC Allschwil 1");
      expect(plannerModel.fixture?.away.displayName).toBe("SV Sissach");
      expect(plannerModel.typeLabel).toBe("SPIEL");
    });
  });

  describe("cross-surface consistency — TRAINING", () => {
    const tenant = "FC Allschwil";

    it("uses the same location hierarchy on series and session management adapters", () => {
      const seriesModel = resolveSceTrainingPresentationFromManagementRow(
        {
          teamSeasonId: "ts-1",
          title: "Training",
          teamDisplayName: "Junioren B1",
          weekdays: ["MONDAY"],
          rhythmLabel: "Mo",
          timeLabel: "18:00–19:30",
          timeDetailLines: null,
          facilityVenueName: "Im Brüel",
          facilityResourceLabel: "KR2",
          status: "ACTIVE",
        },
        tenant,
      );
      const sessionModel = resolveSceTrainingPresentationFromSessionManagementRow(
        {
          sessionId: "session-1",
          trainingSeriesId: "series-1",
          teamSeasonId: "ts-1",
          date: "2026-10-12",
          teamName: "Junioren B1",
          seriesTitle: "Training",
          startAt: "2026-10-12T16:00:00.000Z",
          endAt: "2026-10-12T17:30:00.000Z",
          timezone: "Europe/Zurich",
          facilityLabel: "KR2",
          status: "SCHEDULED",
          displayStatus: "GEPLANT",
          exceptionReasons: [],
          contextLabel: "Aus Serie · Training",
          isRescheduled: false,
        },
        tenant,
      );
      const expected = "FC Allschwil · KR2";
      expect(formatSceActivityLocationHierarchy(seriesModel.location)).toBe("FC Allschwil · Im Brüel · KR2");
      expect(formatSceActivityLocationHierarchy(sessionModel.location)).toBe(expected);
    });

    it("weekplanner training adapter keeps session resource key", () => {
      const item: WeekplannerTrainingItem = {
        id: "training:session-1",
        tenantId: "t1",
        type: "TRAINING",
        startAt: new Date("2026-10-12T16:45:00.000Z"),
        endAt: new Date("2026-10-12T18:15:00.000Z"),
        canonicalStartAt: new Date("2026-10-12T16:45:00.000Z"),
        canonicalEndAt: new Date("2026-10-12T18:15:00.000Z"),
        timeOverridden: false,
        title: "Junioren B1 Training",
        teamNames: ["Junioren B1"],
        pitchAllocations: [
          {
            facilityResourceId: "r1",
            facilityId: "f1",
            code: "KR2",
            name: "KR2",
            facilityName: "Im Brüel",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
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
        trainingSeriesId: "series-1",
        trainingSessionId: "session-1",
        teamSeasonId: "ts-1",
      };
      const model = resolveSceTrainingPresentationFromWeekplannerTraining(item, { tenantClubName: tenant });
      expect(model.resourceKey).toBe("training-session:session-1");
      expect(model.typeLabel).toBe("TRAINING");
    });
  });

  describe("cross-surface consistency — TOURNAMENT", () => {
    it("does not expose VS fixture semantics on tournament presentation", () => {
      const tournament = {
        id: "t1",
        tenantId: "tenant-1",
        title: "Frühlingscup",
        status: "SCHEDULED",
        startAt: new Date("2026-06-01T09:00:00.000Z"),
        endAt: new Date("2026-06-01T17:00:00.000Z"),
        location: "Sportanlage Im Brüel",
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
      } as TournamentDto;

      const model = resolveSceTournamentPresentation({
        tournament,
        tenantClubName: "FC Allschwil",
      });
      expect(model.kind).toBe("TOURNAMENT");
      expect(JSON.stringify(model)).not.toContain('"VS"');
      expect(model.organiser?.displayName).toBe("FC Allschwil");
    });
  });

  describe("cross-surface consistency — CLUB_EVENT", () => {
    it("retains Veranstaltung type identity", () => {
      const event: ClubEvent = applyClubEventOrganisationalAudienceTestDefaults({
        id: "ev-1",
        title: "Generalversammlung",
        description: null,
        location: "Clubhaus",
        startAt: new Date("2026-11-01T18:30:00.000Z"),
        endAt: new Date("2026-11-01T20:00:00.000Z"),
        allDay: false,
        organizerName: "FC Allschwil",
        remarks: null,
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        source: "MANUAL",
        websiteVisible: true,
        infoboardVisible: false,
        homepageVisible: false,
        wochenplanVisible: false,
        trainingsplanVisible: false,
        teamPageVisible: false,
        tenantId: "t1",
        seasonId: null,
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        season: null,
      });
      const model = resolveSceClubEventPresentation({
        event,
        tenantClubName: "FC Allschwil",
      });
      expect(model.typeLabel).toBe("VERANSTALTUNG");
      expect(model.kind).toBe("CLUB_EVENT");
    });
  });

  describe("Wochenplaner Liste — 01H-R4 / R5.5 canonical cards", () => {
    it("routes week items through PlanningHubListeSceActivityCard and World Activity Cards", () => {
      const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
      const card = read("components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx");
      expect(row).toContain("PlanningHubListeSceActivityCard");
      expect(row).toContain("SceProgrammeActivityCardShell");
      expect(card).toContain("SceTrainingCard");
      expect(card).toContain("SceMatchCard");
      expect(card).toContain("SceTournamentCard");
      expect(card).toContain("SceClubEventCard");
      expect(card).toContain('surface="list-row"');
      expect(row).toContain("PlannerOperationalIssueSummary");
    });

    it("R5.5 — no parallel planner card family or table row grid", () => {
      const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
      expect(row).not.toContain("PLANNING_HUB_LISTE_ROW_GRID_CLASS");
      expect(row).not.toContain("planning-hub-liste-row-status");
      const forbidden = [
        "PlanningTrainingCard",
        "PlanningMatchCard",
        "WochenplanActivityCard",
      ];
      for (const name of forbidden) {
        expect(row).not.toContain(name);
      }
    });

    it("R4.3 — match list-row fixture semantics preserved", () => {
      const matchCard = read("components/sporting-activity/SceMatchCard.tsx");
      expect(matchCard).not.toContain('data-sce-match-region="tenant-side-marker"');
      expect(matchCard).toContain("Heimspiel");
    });

    it("R4.2 — shares list-row typography scale across canonical cards", () => {
      const scale = read(
        "lib/sporting-activity-presentation/canonical/activity-card-list-row-scale.ts",
      );
      expect(scale).toContain("SCE_ACTIVITY_LIST_ROW_SCALE");
      for (const card of [
        "components/sporting-activity/SceTrainingCard.tsx",
        "components/sporting-activity/SceMatchCard.tsx",
        "components/sporting-activity/SceTournamentCard.tsx",
        "components/sporting-activity/SceClubEventCard.tsx",
      ]) {
        expect(read(card), card).toContain("SCE_ACTIVITY_LIST_ROW_SCALE");
      }
    });

    it("documents weekplanner veranstaltung presentation adapter", () => {
      expect(
        read("lib/sporting-activity-presentation/canonical/adapters/weekplanner-veranstaltung.ts"),
      ).toContain("resolveSceClubEventPresentationFromWeekplannerVeranstaltung");
    });
  });

  describe("training management list — R3 column ownership", () => {
    it("places recurring schedule time in ZEIT column, not inside SceTrainingCard list-row", () => {
      const rowSource = read("components/admin/training/TrainingSeriesManagementRow.tsx");
      const cardSource = read("components/sporting-activity/SceTrainingCard.tsx");
      expect(rowSource).toContain('data-testid="training-series-row-time"');
      expect(rowSource).toContain("TrainingWeekdayPills");
      expect(rowSource).not.toContain("hideDuplicateTimeColumn");
      expect(cardSource).toContain("hideCompactTime");
      expect(cardSource).toContain('surface === "list-row"');
    });

    it("keeps session management time column separate from series grid semantics", () => {
      const sessionRow = read("components/admin/training/TrainingSessionManagementRow.tsx");
      expect(sessionRow).toContain('data-testid="training-session-row-time"');
      expect(sessionRow).toContain('surface="list-row"');
    });
  });

  describe("design system + toggle guardrails", () => {
    it("does not introduce new binary checkboxes in 01H touched surfaces", () => {
      const paths = [
        "components/admin/training/TrainingSessionManagementRow.tsx",
        "components/admin/wochenplan/WochenplanEventCard.tsx",
        "components/admin/planning-hub/PlanningHubActivityBlock.tsx",
        "lib/planning-hub/planner-sporting-activity-type-label.ts",
      ];
      for (const path of paths) {
        const source = read(path);
        expect(source).not.toMatch(/type=["']checkbox["']/);
      }
    });
  });

  describe("legacy inventory — deferred to 01N", () => {
    it("documents residual MatchCard bulk panel until bulk surface retires", () => {
      const bulk = read("components/admin/matchcenter/MatchcenterWochenplanBulkPanel.tsx");
      expect(bulk).toContain("MatchCard");
      expect(read("components/admin/matchcenter/SpieleManagementMatchRow.tsx")).toContain("SceMatchCard");
    });

    it("VeranstaltungCard grid module is unused (list row is canonical)", () => {
      expect(read("components/admin/veranstaltungen/VeranstaltungListRow.tsx")).toContain("SceClubEventCard");
    });
  });
});
