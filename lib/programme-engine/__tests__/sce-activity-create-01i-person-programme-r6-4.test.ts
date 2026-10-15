import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { buildProgrammeResourceKey } from "@/lib/programme-engine/programme-item-id";
import {
  isClubEventRelevantToPersonProgrammeContext,
  isMatchRelevantToPersonProgrammeScope,
  queryProgramme,
} from "@/lib/programme-engine";
import { buildPersonProgrammeScope } from "@/lib/programme-engine/person-programme-scope";
import { programmeItemsToPersonalProgrammeItems } from "@/lib/programme-engine/programme-item-personal-adapter";
import type { ClubEventOrganisationalAudienceSnapshot } from "@/lib/events/club-event-programme-eligibility";

const mocks = vi.hoisted(() => ({
  listTrainingSessions: vi.fn(),
  listMatchcenterMatches: vi.fn(),
  listTournaments: vi.fn(),
  eventFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  teamFindMany: vi.fn(),
  playerSquadFindFirst: vi.fn(),
  trainerTeamFindFirst: vi.fn(),
  orgUnitMembershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/training/session-generation-service", () => ({
  listTrainingSessions: mocks.listTrainingSessions,
}));

vi.mock("@/lib/matchcenter/query-service", () => ({
  listMatchcenterMatches: mocks.listMatchcenterMatches,
}));

vi.mock("@/lib/tournaments/tournament-service", () => ({
  listTournaments: mocks.listTournaments,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: mocks.eventFindMany },
    teamSeason: { findMany: mocks.teamSeasonFindMany },
    team: { findMany: mocks.teamFindMany },
    playerSquadMember: { findFirst: mocks.playerSquadFindFirst },
    trainerTeamMember: { findFirst: mocks.trainerTeamFindFirst },
    orgUnitMembership: { findFirst: mocks.orgUnitMembershipFindFirst },
  },
}));

vi.mock("@/lib/sporting-activity-presentation/training-facility-batch", () => ({
  loadTrainingSessionFacilityHints: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/facilities/display-helpers", () => ({
  batchGetEventAllocationDisplayForTenant: vi.fn(async () => []),
}));

vi.mock("@/lib/website/public-matches-identity", () => ({
  loadMatchEventPoliciesByEventId: vi.fn(async () => new Map()),
}));

const TEAM_A = "team-a";
const TEAM_B = "team-b";
const TEAM_C = "team-c";
const TS_A = "ts-a";
const TS_B = "ts-b";
const PERSON = "person-1";
const TENANT = "tenant-1";
const B1 = "team-b1";

function personalContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: TENANT,
    userId: "user-1",
    personId: PERSON,
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: TEAM_A,
        teamName: "Team A",
        kinds: ["PLAYER"],
        assignmentFunctionKeys: [],
        teamSeasonIds: [TS_A],
      },
      {
        teamId: TEAM_B,
        teamName: "Team B",
        kinds: ["TRAINER"],
        assignmentFunctionKeys: [],
        teamSeasonIds: [TS_B],
      },
    ],
    orgUnits: [{ orgUnitId: "ou-exact", orgUnitName: "OU", sources: ["PERSON_MEMBERSHIP"], assignmentFunctionKeys: [] }],
    assignments: [],
    ...overrides,
  };
}

function personScope(ctx = personalContext()) {
  return buildPersonProgrammeScope(ctx);
}

function matchSummary(overrides: Partial<MatchcenterMatchSummary> & { id: string }): MatchcenterMatchSummary {
  return {
    id: overrides.id,
    tenantId: TENANT,
    teamId: overrides.teamId ?? TEAM_A,
    teamSeasonId: overrides.teamSeasonId ?? TS_A,
    seasonId: "season-1",
    type: "MATCH",
    title: overrides.title ?? "Match",
    description: null,
    status: "SCHEDULED",
    startAt: overrides.startAt ?? new Date("2026-10-17T13:00:00.000Z"),
    kickoffKnown: true,
    endAt: null,
    operationalEndAtOverride: null,
    operationalEndAt: null,
    location: "Pitch",
    competitionLabel: null,
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: overrides.home ?? {
      providerTeamId: null,
      providerTeamName: "Home",
      canonicalTeamId: TEAM_A,
      canonicalTeamName: "Team A",
      displayName: "Team A",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: overrides.away ?? {
      providerTeamId: null,
      providerTeamName: "Away",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "Away",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
    },
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
    publishedAt: null,
    participationResponseDueAt: null,
    participationReminder1At: null,
    participationReminder2At: null,
    participationReminder1PresetKey: null,
    participationReminder2PresetKey: null,
  };
}

describe("SCE-ACTIVITY-CREATE-01I R6.4 — PERSON programme scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTrainingSessions.mockResolvedValue([]);
    mocks.listMatchcenterMatches.mockResolvedValue([]);
    mocks.listTournaments.mockResolvedValue([]);
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.teamSeasonFindMany.mockResolvedValue([]);
    mocks.teamFindMany.mockResolvedValue([]);
    mocks.playerSquadFindFirst.mockResolvedValue(null);
    mocks.trainerTeamFindFirst.mockResolvedValue(null);
    mocks.orgUnitMembershipFindFirst.mockResolvedValue(null);
  });

  const queryArgs = {
    tenantId: TENANT,
    userId: "user-1",
    timeZone: "Europe/Zurich",
    from: new Date("2026-10-01T00:00:00.000Z"),
    to: new Date("2026-10-31T23:59:59.999Z"),
    permissionKeys: [
      PERMISSIONS.EVENTS_VIEW,
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.TOURNAMENTS_VIEW,
    ],
    tenantClubName: "FC Test",
  };

  it("includes complete authorized activity projection for multi-team person", async () => {
    mocks.listTrainingSessions.mockResolvedValue([
      {
        id: "tr-a",
        tenantId: TENANT,
        teamSeasonId: TS_A,
        startAt: new Date("2026-10-05T16:00:00.000Z"),
        endAt: new Date("2026-10-05T17:30:00.000Z"),
        status: "SCHEDULED",
        trainingSeriesTitle: "Team A training",
        teamName: "Team A",
        trainingSeriesId: "series-a",
      },
      {
        id: "tr-b",
        tenantId: TENANT,
        teamSeasonId: TS_B,
        startAt: new Date("2026-10-06T16:00:00.000Z"),
        endAt: null,
        status: "SCHEDULED",
        trainingSeriesTitle: "Team B training",
        teamName: "Team B",
        trainingSeriesId: "series-b",
      },
      {
        id: "tr-c",
        tenantId: TENANT,
        teamSeasonId: "ts-c",
        startAt: new Date("2026-10-07T16:00:00.000Z"),
        endAt: null,
        status: "SCHEDULED",
        trainingSeriesTitle: "Team C training",
        teamName: "Team C",
        trainingSeriesId: "series-c",
      },
    ]);

    mocks.teamSeasonFindMany.mockResolvedValue([
      { id: TS_A, teamId: TEAM_A, team: { orgUnitId: null } },
      { id: TS_B, teamId: TEAM_B, team: { orgUnitId: null } },
    ]);

    mocks.listMatchcenterMatches.mockResolvedValue([
      matchSummary({ id: "m-home", home: { providerTeamId: null, providerTeamName: "A", canonicalTeamId: TEAM_A, canonicalTeamName: "A", displayName: "A", resolution: "RESOLVED", isOwnTeam: true }, away: { providerTeamId: null, providerTeamName: "Opp", canonicalTeamId: null, canonicalTeamName: null, displayName: "Opp", resolution: "UNRESOLVED", isOwnTeam: false } }),
      matchSummary({
        id: "m-away",
        teamSeasonId: null,
        teamId: null,
        home: { providerTeamId: null, providerTeamName: "Ext", canonicalTeamId: null, canonicalTeamName: null, displayName: "Ext", resolution: "UNRESOLVED", isOwnTeam: false },
        away: { providerTeamId: null, providerTeamName: "B", canonicalTeamId: TEAM_B, canonicalTeamName: "B", displayName: "B", resolution: "RESOLVED", isOwnTeam: true },
      }),
      matchSummary({
        id: "m-unrelated",
        teamSeasonId: "ts-c",
        teamId: TEAM_C,
        home: { providerTeamId: null, providerTeamName: "C", canonicalTeamId: TEAM_C, canonicalTeamName: "C", displayName: "C", resolution: "RESOLVED", isOwnTeam: true },
        away: { providerTeamId: null, providerTeamName: "X", canonicalTeamId: null, canonicalTeamName: null, displayName: "X", resolution: "UNRESOLVED", isOwnTeam: false },
      }),
    ]);

    mocks.listTournaments.mockResolvedValue([
      {
        id: "t-a",
        tenantId: TENANT,
        title: "Team A Cup",
        startAt: new Date("2026-10-10T08:00:00.000Z"),
        endAt: new Date("2026-10-10T12:00:00.000Z"),
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        teamSeasonId: TS_A,
        team: { id: TEAM_A, name: "Team A" },
        participants: [],
        resourceAllocations: [],
        organizerName: null,
        location: null,
        homeAway: null,
      },
      {
        id: "t-c",
        tenantId: TENANT,
        title: "Team C Cup",
        startAt: new Date("2026-10-11T08:00:00.000Z"),
        endAt: null,
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        teamSeasonId: "ts-c",
        team: { id: TEAM_C, name: "Team C" },
        participants: [],
        resourceAllocations: [],
        organizerName: null,
        location: null,
        homeAway: null,
      },
    ]);

    mocks.playerSquadFindFirst.mockImplementation(async (args: {
      where?: { teamSeason?: { teamId?: { in?: string[] } } };
    }) => {
      const teamIds = args.where?.teamSeason?.teamId?.in ?? [];
      if (teamIds.includes(TEAM_A) || teamIds.includes(TEAM_B)) {
        return { id: "squad-hit" };
      }
      return null;
    });

    mocks.eventFindMany.mockResolvedValue([
      {
        id: "ce-club",
        tenantId: TENANT,
        teamId: null,
        teamSeasonId: null,
        title: "Club AGM",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        startAt: new Date("2026-10-18T17:00:00.000Z"),
        endAt: new Date("2026-10-18T19:00:00.000Z"),
        allDay: false,
        location: "Saal",
        organizerName: null,
        clubEventOrganisationalScope: "CLUB_WIDE",
        clubEventOrganisationalAudienceTeams: [],
        clubEventOrganisationalAudienceOrgUnits: [],
        team: null,
      },
      {
        id: "ce-team-a",
        tenantId: TENANT,
        teamId: TEAM_A,
        teamSeasonId: TS_A,
        title: "Team A event",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        startAt: new Date("2026-10-19T17:00:00.000Z"),
        endAt: null,
        allDay: false,
        location: null,
        organizerName: null,
        clubEventOrganisationalScope: "SELECTED_TEAMS",
        clubEventOrganisationalAudienceTeams: [{ teamId: TEAM_A }],
        clubEventOrganisationalAudienceOrgUnits: [],
        team: { id: TEAM_A, orgUnitId: null, name: "Team A" },
      },
      {
        id: "ce-team-c",
        tenantId: TENANT,
        teamId: TEAM_C,
        teamSeasonId: "ts-c",
        title: "Team C event",
        status: "SCHEDULED",
        reviewStage: "APPROVED",
        startAt: new Date("2026-10-20T17:00:00.000Z"),
        endAt: null,
        allDay: false,
        location: null,
        organizerName: null,
        clubEventOrganisationalScope: "SELECTED_TEAMS",
        clubEventOrganisationalAudienceTeams: [{ teamId: TEAM_C }],
        clubEventOrganisationalAudienceOrgUnits: [],
        team: { id: TEAM_C, orgUnitId: null, name: "Team C" },
      },
    ]);

    const ctx = personalContext();
    const result = await queryProgramme({
      ...queryArgs,
      scope: buildPersonProgrammeScope(ctx),
    });

    const keys = new Set(result.items.map((item) => `${item.kind}:${item.domainId}`));

    expect(keys.has("TRAINING:tr-a")).toBe(true);
    expect(keys.has("TRAINING:tr-b")).toBe(true);
    expect(keys.has("TRAINING:tr-c")).toBe(false);
    expect(keys.has("MATCH:m-home")).toBe(true);
    expect(keys.has("MATCH:m-away")).toBe(true);
    expect(keys.has("MATCH:m-unrelated")).toBe(false);
    expect(keys.has("TOURNAMENT:t-a")).toBe(true);
    expect(keys.has("TOURNAMENT:t-c")).toBe(false);
    expect(keys.has("CLUB_EVENT:ce-club")).toBe(true);
    expect(keys.has("CLUB_EVENT:ce-team-a")).toBe(true);
    expect(keys.has("CLUB_EVENT:ce-team-c")).toBe(false);

    const personalItems = programmeItemsToPersonalProgrammeItems(result.items, ctx);
    expect(personalItems.every((row) => row.canonicalPresentation != null)).toBe(true);
    expect(personalItems.some((row) => row.id === buildProgrammeResourceKey("MATCH", "m-away"))).toBe(
      true,
    );
  });

  it("null teamSeason SFV match is relevant to B1 person scope", () => {
    const scope = buildPersonProgrammeScope(
      personalContext({
        teams: [
          {
            teamId: B1,
            teamName: "Junioren B1",
            kinds: ["PLAYER"],
            assignmentFunctionKeys: [],
            teamSeasonIds: ["ts-b1"],
          },
        ],
      }),
    );

    const sfvMatch = matchSummary({
      id: "sfv-b1",
      teamSeasonId: null,
      teamId: null,
      title: "FC Concordia Basel b vs FC Allschwil Junioren B1",
      home: {
        providerTeamId: 1,
        providerTeamName: "FC Concordia Basel b",
        canonicalTeamId: null,
        canonicalTeamName: null,
        displayName: "FC Concordia Basel b",
        resolution: "UNRESOLVED",
        isOwnTeam: false,
      },
      away: {
        providerTeamId: 2,
        providerTeamName: "Junioren B1",
        canonicalTeamId: B1,
        canonicalTeamName: "Junioren B1",
        displayName: "Junioren B1",
        resolution: "RESOLVED",
        isOwnTeam: true,
      },
    });

    expect(isMatchRelevantToPersonProgrammeScope(sfvMatch, scope)).toBe(true);
  });

  describe("club event audience regressions", () => {
    const scope = personScope();

    it("CLUB_WIDE is included", () => {
      const audience: ClubEventOrganisationalAudienceSnapshot = {
        scope: "CLUB_WIDE",
        teamIds: [],
        orgUnitIds: [],
      };
      expect(isClubEventRelevantToPersonProgrammeContext(audience, scope)).toBe(true);
    });

    it("exact org unit on person context is included", () => {
      const audience: ClubEventOrganisationalAudienceSnapshot = {
        scope: "SELECTED_ORG_UNITS",
        teamIds: [],
        orgUnitIds: ["ou-exact"],
      };
      expect(isClubEventRelevantToPersonProgrammeContext(audience, scope)).toBe(true);
    });

    it("descendant-only org unit is excluded (no expansion)", () => {
      const audience: ClubEventOrganisationalAudienceSnapshot = {
        scope: "SELECTED_ORG_UNITS",
        teamIds: [],
        orgUnitIds: ["ou-child-only"],
      };
      expect(isClubEventRelevantToPersonProgrammeContext(audience, scope)).toBe(false);
    });

    it("selected team matching membership is included", () => {
      const audience: ClubEventOrganisationalAudienceSnapshot = {
        scope: "SELECTED_TEAMS",
        teamIds: [TEAM_A],
        orgUnitIds: [],
      };
      expect(isClubEventRelevantToPersonProgrammeContext(audience, scope)).toBe(true);
    });

    it("unrelated selected team is excluded", () => {
      const audience: ClubEventOrganisationalAudienceSnapshot = {
        scope: "SELECTED_TEAMS",
        teamIds: [TEAM_C],
        orgUnitIds: [],
      };
      expect(isClubEventRelevantToPersonProgrammeContext(audience, scope)).toBe(false);
    });
  });
});
