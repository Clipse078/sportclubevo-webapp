/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical/adapters/match";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { SceClubEventPresentationModel, SceMatchPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";
import { buildPersonalCalendarMicroEntry } from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import { buildProgrammeCalendarMicroEntry } from "@/lib/programme-engine/programme-calendar-presentation";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { resolveTeamScopeMatchOpponent } from "../calendar-micro-match-identity";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const FCA_B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const FCA_B2_TEAM_ID = "cmrkh1mb1000i04jurtajh263";
const TENANT_LOGO = "https://cdn.example/fca.png";
const CONCORDIA_LOGO = "https://cdn.example/concordia.png";

function concordiaAwayMatch(): MatchcenterMatchSummary {
  return {
    id: "match-concordia-away",
    tenantId: "tenant-fca",
    teamId: FCA_B1_TEAM_ID,
    teamSeasonId: null,
    seasonId: "season-fca-active",
    type: "MATCH",
    title: "FC Concordia Basel b vs FC Allschwil Junioren B1",
    description: null,
    status: "SCHEDULED",
    startAt: new Date("2026-10-17T13:00:00.000Z"),
    kickoffKnown: true,
    endAt: null,
    operationalEndAtOverride: null,
    operationalEndAt: new Date("2026-10-17T15:00:00.000Z"),
    location: "Sportanlagen St. Jakob, Basel - wird vor Ort zugeteilt",
    competitionLabel: "Meisterschaft",
    homeAway: "AWAY",
    resultLabel: null,
    intermediateResultLabel: null,
    scoreHome: null,
    scoreAway: null,
    home: {
      providerTeamId: 50001,
      providerTeamName: "FC Concordia Basel b",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Concordia Basel b",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
      externalLogoUrl: CONCORDIA_LOGO,
    },
    away: {
      providerTeamId: 31924,
      providerTeamName: "FC Allschwil Junioren B1",
      canonicalTeamId: FCA_B1_TEAM_ID,
      canonicalTeamName: "FC Allschwil Junioren B1",
      displayName: "Junioren B1",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    source: {
      eventSource: "SFV",
      externalSource: "SFV",
      externalSourceId: "9002",
      provider: "SFV",
      externalMatchId: 9002,
      externalSeasonId: 2027,
      matchNumber: 2,
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

function homeMatchForB2(): MatchcenterMatchSummary {
  const base = concordiaAwayMatch();
  return {
    ...base,
    id: "match-b2-home",
    homeAway: "HOME",
    home: {
      providerTeamId: 31925,
      providerTeamName: "FC Allschwil Junioren B2",
      canonicalTeamId: FCA_B2_TEAM_ID,
      canonicalTeamName: "FC Allschwil Junioren B2",
      displayName: "Junioren B2",
      resolution: "RESOLVED",
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 50002,
      providerTeamName: "FC Rival Basel",
      canonicalTeamId: null,
      canonicalTeamName: null,
      displayName: "FC Rival Basel",
      resolution: "UNRESOLVED",
      isOwnTeam: false,
      externalLogoUrl: "https://cdn.example/rival.png",
    },
  };
}

function personalMatchItem(input: {
  presentation: SceMatchPresentationModel;
  programmeScopeTeamId: string | null;
}): NormalizedCalendarItem {
  return {
    id: "event:match-1",
    sourceType: "event",
    sourceId: "match-1",
    semanticType: "MATCH",
    title: "Spiel",
    startAt: concordiaAwayMatch().startAt,
    endAt: null,
    allDay: false,
    location: concordiaAwayMatch().location ?? undefined,
    deepLink: "/match/m1",
    iconKey: "match",
    typeLabel: "Spiel",
    ariaLabel: "Spiel",
    canonicalPresentation: input.presentation,
    programmeScopeTeamId: input.programmeScopeTeamId,
  };
}

function clubEventPresentation(tenantLogo: string | null): SceClubEventPresentationModel {
  return {
    kind: "CLUB_EVENT",
    activityId: "ev1",
    resourceKey: "event:ev1",
    typeLabel: "Veranstaltung",
    eventTitle: "18. Mitgliederversammlung",
    tenantClub: buildClubIdentity({
      displayName: "FC Allschwil",
      logoUrl: tenantLogo,
    }),
    schedule: {
      startAt: new Date("2026-10-05T17:00:00.000Z").toISOString(),
      endAt: new Date("2026-10-05T20:00:00.000Z").toISOString(),
      allDay: false,
    },
    location: buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Saal (Schulhaus) Gartenhof",
    }),
    route: { resourceKey: "rk", consumeHref: "/ev", manageHref: null },
  };
}

describe("SCE-ACTIVITY-CREATE-01I-R6.5 — personal calendar MICRO crest propagation", () => {
  const matchPresentation = resolveSceMatchPresentation({
    match: concordiaAwayMatch(),
    tenantClubName: "FC Allschwil",
    tenantLogoUrl: TENANT_LOGO,
  });

  it("A: PERSON match AWAY — home opponent crest and name", () => {
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Concordia Basel b");
    expect(entry.visualIdentity?.identity.logoUrl).toBe(CONCORDIA_LOGO);
    expect(entry.accessibleLabel).toContain("gegen FC Concordia Basel b");
    expect(entry.identityLabel).not.toContain("Junioren B1");
  });

  it("B: PERSON match HOME — away opponent crest", () => {
    const presentation = resolveSceMatchPresentation({
      match: homeMatchForB2(),
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: TENANT_LOGO,
    });
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation,
        programmeScopeTeamId: FCA_B2_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(entry.identityLabel).toBe("FC Rival Basel");
    expect(entry.visualIdentity?.identity.logoUrl).toBe("https://cdn.example/rival.png");
  });

  it("C: SFV match teamSeasonId null — scope team id still resolves opponent crest", () => {
    expect(concordiaAwayMatch().teamSeasonId).toBeNull();
    const scoped = resolveTeamScopeMatchOpponent(matchPresentation.fixture, FCA_B1_TEAM_ID);
    expect(scoped?.opponent.displayName).toBe("FC Concordia Basel b");
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Concordia Basel b");
  });

  it("D: multiple personal teams — fixture uses participating scope team", () => {
    const b2Presentation = resolveSceMatchPresentation({
      match: homeMatchForB2(),
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: TENANT_LOGO,
    });
    const wrongScope = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: b2Presentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(wrongScope.visualIdentity).toBeUndefined();
    expect(wrongScope.identityLabel).toContain("–");

    const correctScope = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: b2Presentation,
        programmeScopeTeamId: FCA_B2_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(correctScope.identityLabel).toBe("FC Rival Basel");
    expect(correctScope.visualIdentity?.kind).toBe("CLUB_CREST");
  });

  it("E: no resolvable personal side — truthful fallback, no crest", () => {
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: null,
      }),
      FMT,
      {},
    );
    expect(entry.visualIdentity).toBeUndefined();
    expect(entry.identityLabel).toContain("FC Concordia Basel b");
    expect(entry.identityLabel).toContain("Junioren B1");
  });

  it("F: club event — tenant crest on MICRO visualIdentity", () => {
    const entry = buildPersonalCalendarMicroEntry(
      {
        id: "event:ev1",
        sourceType: "event",
        sourceId: "ev1",
        semanticType: "EVENT",
        title: "18. Mitgliederversammlung",
        startAt: new Date("2026-10-05T17:00:00.000Z"),
        endAt: new Date("2026-10-05T20:00:00.000Z"),
        allDay: false,
        deepLink: "/ev/1",
        iconKey: "event",
        typeLabel: "Veranstaltung",
        ariaLabel: "Veranstaltung",
        canonicalPresentation: clubEventPresentation(TENANT_LOGO),
      },
      FMT,
      {},
    );
    expect(entry.identityLabel).toBe("18. Mitgliederversammlung");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Allschwil");
    expect(entry.timeLabel).toBe("19:00–22:00");
    expect(entry.locationLabel).toBe("Saal (Schulhaus) Gartenhof");
  });

  it("G: tenant without crest — no visualIdentity, title remains", () => {
    const entry = buildPersonalCalendarMicroEntry(
      {
        id: "event:ev2",
        sourceType: "event",
        sourceId: "ev2",
        semanticType: "EVENT",
        title: "18. Mitgliederversammlung",
        startAt: new Date("2026-10-05T17:00:00.000Z"),
        allDay: false,
        deepLink: "/ev/2",
        iconKey: "event",
        typeLabel: "Veranstaltung",
        ariaLabel: "Veranstaltung",
        canonicalPresentation: clubEventPresentation(null),
      },
      FMT,
      {},
    );
    expect(entry.visualIdentity).toBeUndefined();
    expect(entry.identityLabel).toBe("18. Mitgliederversammlung");
  });

  it("H: tournament organiser crest unchanged on personal path", () => {
    const organiser = buildClubIdentity({
      displayName: "FC Arisdorf",
      logoUrl: "https://cdn.example/arisdorf.png",
    });
    const entry = buildPersonalCalendarMicroEntry(
      {
        id: "event:t1",
        sourceType: "event",
        sourceId: "t1",
        semanticType: "TOURNAMENT",
        title: "PlayMore Turnier",
        startAt: new Date("2026-10-09T07:30:00.000Z"),
        endAt: new Date("2026-10-09T09:30:00.000Z"),
        allDay: false,
        deepLink: "/tournament/t1",
        iconKey: "tournament",
        typeLabel: "Turnier",
        ariaLabel: "Turnier",
        canonicalPresentation: {
          kind: "TOURNAMENT",
          activityId: "t1",
          resourceKey: "tournament:t1",
          typeLabel: "Turnier",
          tournamentTitle: "PlayMore Turnier",
          organiser,
          schedule: {
            startAt: new Date("2026-10-09T07:30:00.000Z").toISOString(),
            endAt: new Date("2026-10-09T09:30:00.000Z").toISOString(),
            allDay: false,
          },
          location: buildSportingActivityLocation({
            mode: "AWAY",
            hostOrOrganiser: "FC Arisdorf",
            venueName: "Gemeindesportplatz",
          }),
          route: { resourceKey: "rk", consumeHref: "/to", manageHref: null },
        },
      },
      FMT,
      {},
    );
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Arisdorf");
    expect(entry.timeLabel).toBe("09:30–11:30");
  });

  it("I: training tenant crest unchanged", () => {
    const entry = buildPersonalCalendarMicroEntry(
      {
        id: "training-session:tr1",
        sourceType: "training-session",
        sourceId: "tr1",
        semanticType: "TRAINING",
        title: "Training",
        startAt: new Date("2026-10-20T16:45:00.000Z"),
        endAt: new Date("2026-10-20T18:15:00.000Z"),
        allDay: false,
        deepLink: "/training/tr1",
        iconKey: "training",
        typeLabel: "Training",
        ariaLabel: "Training",
        canonicalPresentation: {
          kind: "TRAINING",
          activityId: "tr1",
          resourceKey: "training:tr1",
          typeLabel: "Training",
          trainingTitle: "Training",
          team: { name: "Junioren B1" },
          tenantClub: buildClubIdentity({
            displayName: "FC Allschwil",
            logoUrl: TENANT_LOGO,
          }),
          schedule: {
            startAt: new Date("2026-10-20T16:45:00.000Z").toISOString(),
            endAt: new Date("2026-10-20T18:15:00.000Z").toISOString(),
            allDay: false,
          },
          location: buildSportingActivityLocation({
            mode: "HOME",
            venueName: "Kunstrasen 2 B",
          }),
          route: { resourceKey: "rk", consumeHref: "/tr", manageHref: null },
        },
      },
      FMT,
      {},
    );
    expect(entry.visualIdentity?.identity.logoUrl).toBe(TENANT_LOGO);
    expect(entry.timeLabel).toBe("18:45–20:15");
  });

  it("J: match kickoff-only time unchanged", () => {
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(entry.timeLabel).toBe("15:00");
  });

  it("K: match location does not duplicate opponent", () => {
    const entry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(entry.locationLabel).toBe(
      "Sportanlagen St. Jakob, Basel - wird vor Ort zugeteilt",
    );
    expect(entry.locationLabel).not.toContain("Concordia");
  });

  it("team programme and personal calendar share opponent MICRO when scope team matches", () => {
    const programmeEntry = buildProgrammeCalendarMicroEntry(
      {
        id: "MATCH:m1",
        kind: "MATCH",
        domainId: "m1",
        resourceKey: "event:m1",
        startsAt: concordiaAwayMatch().startAt,
        endsAt: null,
        allDay: false,
        presentation: matchPresentation,
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/match/m1",
      },
      FMT,
    );
    const personalEntry = buildPersonalCalendarMicroEntry(
      personalMatchItem({
        presentation: matchPresentation,
        programmeScopeTeamId: FCA_B1_TEAM_ID,
      }),
      FMT,
      {},
    );
    expect(personalEntry.identityLabel).toBe(programmeEntry.identityLabel);
    expect(personalEntry.visualIdentity?.identity.logoUrl).toBe(
      programmeEntry.visualIdentity?.identity.logoUrl,
    );
    expect(personalEntry.timeLabel).toBe(programmeEntry.timeLabel);
    expect(personalEntry.locationLabel).toBe(programmeEntry.locationLabel);
  });
});
