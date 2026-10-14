import { describe, expect, it } from "vitest";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import type { TournamentDto } from "@/lib/tournaments/types";
import {
  buildGenericSportingEventPresentation,
  buildMatchActivityPresentation,
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import {
  buildSceActivityRoute,
  formatSceActivityLocationHierarchy,
  isSceActivityPresentationModel,
  mapLegacySportingActivityKindToSceKind,
  resolveSceActivityPresentation,
  resolveSceActivityPresentationFromLegacy,
  resolveSceMatchPresentation,
  resolveSceTournamentPresentation,
  resolveSceTrainingPresentationFromLegacy,
} from "@/lib/sporting-activity-presentation/canonical";

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

function createMatch(overrides: Partial<MatchcenterMatchSummary> = {}): MatchcenterMatchSummary {
  return {
    id: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamSeasonId: "ts-1",
    seasonId: "season-2026-2027",
    type: "MATCH",
    title: "FC Allschwil – FC Therwil",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-10-13T18:15:00.000Z"),
    kickoffKnown: true,
    endAt: new Date("2026-10-13T20:15:00.000Z"),
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-10-13T20:15:00.000Z"),
    location: "Im Brüel",
    competitionLabel: "Meisterschaft",
    homeAway: "HOME",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: side({
      displayName: "FC Allschwil",
      isOwnTeam: true,
      canonicalTeamShortName: "FCA",
    }),
    away: side({
      displayName: "FC Therwil",
      canonicalExternalTeamShortName: "FCT",
      externalLogoUrl: "https://cdn.example/fct.png",
    }),
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "1",
      provider: "SFV",
      externalMatchId: 1,
      externalSeasonId: 2027,
      matchNumber: 1,
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
    ...overrides,
  };
}

function createTournament(overrides: Partial<TournamentDto> = {}): TournamentDto {
  return {
    id: "tournament-1",
    tenantId: "tenant-1",
    title: "Herbst Cup",
    description: null,
    status: "SCHEDULED",
    source: "MANUAL",
    startAt: "2026-09-19T08:00:00.000Z",
    endAt: null,
    meetingTime: null,
    location: "Im Brüel",
    organizerName: "FC Allschwil",
    organizerLogoUrl: "https://cdn.example/organizer.png",
    organizerExternalClubId: "club-fca",
    competitionLabel: null,
    resultLabel: null,
    remarks: null,
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
    team: {
      id: "team-e",
      name: "Junioren E",
      slug: "e",
      category: "JUNIOREN",
      genderGroup: null,
      ageGroup: "E",
    },
    teamLogoUrl: null,
    homeAway: "HOME",
    participants: [],
    resourceAllocations: [
      {
        id: "alloc-1",
        facilityResourceId: "res-1",
        facilityResourceName: "Hauptfeld A",
        facilityResourceCode: "HFA",
        facilityVenueName: "Im Brüel",
        facilityVenueId: "venue-1",
        startAt: "2026-09-19T08:00:00.000Z",
        endAt: null,
      },
    ],
    ...overrides,
  } as TournamentDto;
}

describe("SCE-UI-ROLLOUT-01C — shared contract", () => {
  it("maps legacy EVENT kind to CLUB_EVENT", () => {
    expect(mapLegacySportingActivityKindToSceKind("EVENT")).toBe("CLUB_EVENT");
  });

  it("builds canonical routes without mutating source DTOs", () => {
    const presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:s1",
      title: "Training",
      typeLabel: "Training",
      startAt: new Date("2026-10-10T08:00:00.000Z"),
    });
    const before = structuredClone(presentation);
    const model = resolveSceTrainingPresentationFromLegacy(presentation);
    expect(presentation).toEqual(before);
    expect(model.route.consumeHref).toBe("/dashboard/activity/training-session/s1");
    expect(isSceActivityPresentationModel(model)).toBe(true);
  });
});

describe("SCE-UI-ROLLOUT-01C — MATCH", () => {
  const tenantLogo = "https://cdn.example/fca.png";

  it("HOME IS LEFT / AWAY IS RIGHT for SCE club home fixture", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch(),
      tenantLogoUrl: tenantLogo,
      tenantClubName: "FC Allschwil",
      assessment: assessMatchOperationalState(createMatch()),
    });
    expect(model.fixture.homeLeftAwayRightInvariant).toBe(true);
    expect(model.fixture.home.displayName).toBe("FCA");
    expect(model.fixture.away.displayName).toBe("FCT");
    expect(model.fixture.home.logoUrl).toBe(tenantLogo);
    expect(model.fixture.away.logoUrl).toContain("fct.png");
  });

  it("does not reverse sides when tenant plays away", () => {
    const awayMatch = createMatch({
      homeAway: "AWAY",
      home: side({
        displayName: "FC Therwil",
        canonicalExternalTeamShortName: "FCT",
        externalLogoUrl: "https://cdn.example/fct-home.png",
      }),
      away: side({
        displayName: "FC Allschwil",
        isOwnTeam: true,
        canonicalTeamShortName: "FCA",
      }),
    });
    const model = resolveSceMatchPresentation({
      match: awayMatch,
      tenantLogoUrl: tenantLogo,
    });
    expect(model.fixture.home.displayName).toBe("FCT");
    expect(model.fixture.away.displayName).toBe("FCA");
  });

  it("neutral perspective keeps fixture order", () => {
    const neutral = createMatch({
      home: side({
        displayName: "Club A",
        externalLogoUrl: "https://cdn.example/a.png",
        isOwnTeam: false,
      }),
      away: side({ displayName: "Club B", isOwnTeam: false }),
    });
    const model = resolveSceMatchPresentation({ match: neutral, tenantLogoUrl: null });
    expect(model.fixture.home.displayName).toBe("Club A");
    expect(model.fixture.away.displayName).toBe("Club B");
  });

  it("includes competition, schedule, venue resource, status, route, result absent", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch(),
      tenantLogoUrl: tenantLogo,
    });
    expect(model.competition?.label).toBe("Meisterschaft");
    expect(model.schedule.startAt).toContain("2026-10-13");
    expect(model.location.facilityResource).toBe("KR2");
    expect(model.location.venueName).toBe("Im Brüel");
    expect(model.matchLifecycle?.label).toBeTruthy();
    expect(model.route.manageHref).toBe("/dashboard/matchcenter/match-1");
    expect(model.route.consumeHref).toBe("/dashboard/activity/event/match-1");
    expect(model.result).toBeNull();
  });

  it("includes result when domain provides score label", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        status: "COMPLETED",
        resultLabel: "2:1",
        scoreHome: 2,
        scoreAway: 1,
      }),
      tenantLogoUrl: tenantLogo,
    });
    expect(model.result?.displayLabel).toBe("2:1");
    expect(model.result?.scoreHome).toBe(2);
  });

  it("does not treat zero scores as a result for upcoming fixtures", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        status: "SCHEDULED",
        scoreHome: 0,
        scoreAway: 0,
        resultLabel: null,
      }),
      tenantLogoUrl: tenantLogo,
    });
    expect(model.result).toBeNull();
  });

  it("includes actual 0:0 when lifecycle is completed", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        status: "COMPLETED",
        resultLabel: "0:0",
        scoreHome: 0,
        scoreAway: 0,
      }),
      tenantLogoUrl: tenantLogo,
    });
    expect(model.result?.displayLabel).toBe("0:0");
  });

  it("degrades when crests missing", () => {
    const model = resolveSceMatchPresentation({
      match: createMatch({
        home: side({ displayName: "Home FC", isOwnTeam: true }),
        away: side({ displayName: "Away FC" }),
      }),
      tenantLogoUrl: null,
    });
    expect(model.fixture.home.logoUrl).toBeNull();
    expect(model.fixture.away.logoUrl).toBeNull();
    expect(model.fixture.homeLeftAwayRightInvariant).toBe(true);
  });
});

describe("SCE-UI-ROLLOUT-01C — TRAINING", () => {
  const startAt = new Date("2026-10-10T15:00:00.000Z");

  it("resolves title, team, schedule, status, location hierarchy, route", () => {
    const legacy = buildTrainingActivityPresentation({
      resourceKey: "training-session:42",
      title: "Techniktraining",
      typeLabel: "Training",
      teamName: "Junioren C2",
      clubName: "FC Allschwil",
      startAt,
      endAt: new Date("2026-10-10T16:30:00.000Z"),
      status: "scheduled",
      facilityName: "Im Brüel",
      pitchResourceName: "KR2",
    });
    const model = resolveSceActivityPresentation({ kind: "TRAINING", presentation: legacy });
    expect(model.kind).toBe("TRAINING");
    if (model.kind !== "TRAINING") return;
    expect(model.trainingTitle).toBe("Techniktraining");
    expect(model.team?.name).toBe("Junioren C2");
    expect(model.status?.semantic).toBe("planned");
    expect(formatSceActivityLocationHierarchy(model.location)).toBe("FC Allschwil · Im Brüel · KR2");
    expect(model.route.consumeHref).toContain("training-session/42");
  });

  it("location degrades without broken separators", () => {
    const legacy = buildTrainingActivityPresentation({
      resourceKey: "training-session:43",
      title: "Training",
      typeLabel: "Training",
      startAt,
      facilityName: "Im Brüel",
      pitchResourceName: "KR2",
    });
    const model = resolveSceTrainingPresentationFromLegacy(legacy);
    expect(formatSceActivityLocationHierarchy(model.location)).toBe("Im Brüel · KR2");

    const resourceOnly = buildTrainingActivityPresentation({
      resourceKey: "training-session:44",
      title: "Training",
      typeLabel: "Training",
      startAt,
      pitchResourceName: "KR2",
    });
    expect(
      formatSceActivityLocationHierarchy(
        resolveSceTrainingPresentationFromLegacy(resourceOnly).location,
      ),
    ).toBe("KR2");
  });

  it("planner-list location omits redundant parent venue before child resource", () => {
    const location = {
      mode: "HOME" as const,
      hostOrOrganiser: "FC Allschwil",
      venueName: "Kunstrasen 3",
      facilityResource: "Kunstrasen 3 B",
    };
    expect(
      formatSceActivityLocationHierarchy(location, {
        includeHostClub: false,
        mostSpecificResourceOnly: true,
      }),
    ).toBe("Kunstrasen 3 B");
    expect(
      formatSceActivityLocationHierarchy(location, {
        includeHostClub: false,
        mostSpecificResourceOnly: true,
      }),
    ).not.toContain("Kunstrasen 3 · Kunstrasen 3 B");
  });
});

describe("SCE-UI-ROLLOUT-01C — TOURNAMENT", () => {
  it("never resolves to match home/away grammar", () => {
    const model = resolveSceTournamentPresentation({
      tournament: createTournament(),
      tenantClubName: "FC Allschwil",
    });
    expect(model.kind).toBe("TOURNAMENT");
    expect(model).not.toHaveProperty("fixture");
    expect(model.organiser.displayName).toBe("FC Allschwil");
    expect(model.organiser.logoUrl).toContain("organizer.png");
    expect(model.hauptteam?.name).toBe("Junioren E");
    expect(model.route.manageHref).toBe("/dashboard/tournamentcenter/tournament-1/edit");
  });

  it("missing organiser crest degrades safely", () => {
    const model = resolveSceTournamentPresentation({
      tournament: createTournament({ organizerLogoUrl: null }),
    });
    expect(model.organiser.logoUrl).toBeNull();
    expect(model.organiser.displayName).toBe("FC Allschwil");
  });
});

describe("SCE-UI-ROLLOUT-01C — CLUB_EVENT", () => {
  it("resolves title, organiser, all-day, venue, route without team", () => {
    const legacy = buildGenericSportingEventPresentation({
      resourceKey: "event:ev-1",
      title: "Mitgliederversammlung",
      typeLabel: "Veranstaltung",
      activityKind: "EVENT",
      startAt: new Date("2026-11-01T00:00:00.000Z"),
      allDay: true,
      location: "Clubhaus",
      status: "scheduled",
    });
    const model = resolveSceActivityPresentation({
      kind: "CLUB_EVENT",
      presentation: legacy,
      organiserDisplayName: "FC Allschwil",
    });
    expect(model.kind).toBe("CLUB_EVENT");
    if (model.kind !== "CLUB_EVENT") return;
    expect(model.eventTitle).toBe("Mitgliederversammlung");
    expect(model.organiser?.displayName).toBe("FC Allschwil");
    expect(model.schedule.allDay).toBe(true);
    expect("team" in model).toBe(false);
    expect(model.route.manageHref).toBe("/dashboard/veranstaltungen/ev-1/edit");
    expect(model.route.consumeHref).toBe("/dashboard/activity/event/ev-1");
  });

  it("rejects legacy MATCH without fixture summary", () => {
    const legacy = buildMatchActivityPresentation({
      resourceKey: "event:m1",
      title: "A – B",
      typeLabel: "Spiel",
      startAt: new Date(),
      tenantClubName: "FC Allschwil",
    });
    expect(() => resolveSceActivityPresentationFromLegacy(legacy)).toThrow(/MATCH requires/);
  });
});

describe("SCE-UI-ROLLOUT-01C — routes", () => {
  it("generates stable consume/manage targets per kind", () => {
    expect(buildSceActivityRoute("MATCH", "event:1").manageHref).toBe("/dashboard/matchcenter/1");
    expect(buildSceActivityRoute("TOURNAMENT", "event:2").manageHref).toBe(
      "/dashboard/tournamentcenter/2/edit",
    );
    expect(buildSceActivityRoute("CLUB_EVENT", "event:3").manageHref).toBe(
      "/dashboard/veranstaltungen/3/edit",
    );
  });
});
