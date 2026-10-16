import type { MatchcenterMatchSummary, MatchcenterSide } from "@/lib/matchcenter/types";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import type { SceMatchPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

const TENANT_LOGO = "https://cdn.example/fca.png";

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

export function createSceMatchCardFixtureMatch(
  overrides: Partial<MatchcenterMatchSummary> = {},
): MatchcenterMatchSummary {
  return {
    id: "match-fixture-1",
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
      canonicalTeamId: "team-1",
      canonicalTeamName: "FC Allschwil",
      canonicalTeamShortName: "Junioren B1",
    }),
    away: side({
      displayName: "FC Therwil",
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

export function resolveSceMatchCardFixture(
  overrides: Partial<MatchcenterMatchSummary> = {},
): SceMatchPresentationModel {
  return resolveSceMatchPresentation({
    match: createSceMatchCardFixtureMatch(overrides),
    tenantLogoUrl: TENANT_LOGO,
    tenantClubName: "FC Allschwil",
  });
}

/** PO / preview fixture set — no database access. */
export const SCE_MATCH_CARD_PREVIEW_MODELS = {
  upcomingStandard: resolveSceMatchCardFixture(),
  completedWithResult: resolveSceMatchCardFixture({
    status: "COMPLETED",
    resultLabel: "3:1",
    scoreHome: 3,
    scoreAway: 1,
  }),
  actualZeroZero: resolveSceMatchCardFixture({
    status: "COMPLETED",
    resultLabel: "0:0",
    scoreHome: 0,
    scoreAway: 0,
  }),
  cancelled: resolveSceMatchCardFixture({
    status: "CANCELLED",
  }),
  liveWithScore: resolveSceMatchCardFixture({
    status: "LIVE",
    resultLabel: "2:1",
    scoreHome: 2,
    scoreAway: 1,
  }),
  longNames: resolveSceMatchCardFixture({
    home: side({
      displayName: "FC Allschwil Sportverein Region Basel",
      isOwnTeam: true,
    }),
    away: side({
      displayName: "FC Therwil und Umgebung Spielverein",
      externalLogoUrl: "https://cdn.example/fct.png",
    }),
  }),
  missingCrests: resolveSceMatchCardFixture({
    home: side({ displayName: "Home United", isOwnTeam: true }),
    away: side({ displayName: "Away City" }),
  }),
  awayFixture: resolveSceMatchCardFixture({
    homeAway: "AWAY",
    home: side({ displayName: "FC Liestal", externalLogoUrl: "https://cdn.example/h.png" }),
    away: side({ displayName: "FC Allschwil", isOwnTeam: true }),
  }),
  heuteBadge: (() => {
    const model = resolveSceMatchCardFixture({
      startAt: new Date("2026-10-12T18:15:00.000Z"),
    });
    return {
      ...model,
      matchLifecycle: { domain: "scheduled", label: "Heute", semantic: "warning" as const },
      contextBadges: [{ kind: "tenant-side" as const, label: "Heim" }],
    };
  })(),
  morgenBadge: (() => {
    const model = resolveSceMatchCardFixture({
      startAt: new Date("2026-10-13T18:15:00.000Z"),
    });
    return {
      ...model,
      matchLifecycle: { domain: "scheduled", label: "Morgen", semantic: "planned" as const },
      contextBadges: [{ kind: "tenant-side" as const, label: "Auswärts" }],
    };
  })(),
} as const;
