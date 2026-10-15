import { describe, expect, it } from "vitest";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import {
  buildPersonalCalendarMicroEntry,
} from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import {
  buildProgrammeCalendarMicroEntry,
} from "@/lib/programme-engine/programme-calendar-presentation";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import {
  formatTeamScopeMatchMicroIdentityLabel,
  resolveTeamScopeMatchOpponent,
} from "../calendar-micro-match-identity";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const FCA_B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const TENANT_LOGO = "https://cdn.example/fca.png";

function matchItem(
  match: MatchcenterMatchSummary,
  teamId: string,
): ProgrammeItem {
  const presentation = resolveSceMatchPresentation({
    match,
    tenantClubName: "FC Allschwil",
    tenantLogoUrl: TENANT_LOGO,
  });
  return {
    id: "MATCH:m1",
    kind: "MATCH",
    domainId: match.id,
    resourceKey: `event:${match.id}`,
    startsAt: match.startAt,
    endsAt: match.endAt,
    allDay: false,
    presentation,
    teamId,
    teamSeasonId: "ts-b1",
    orgUnitId: null,
    navigationTarget: `/match/${match.id}`,
  };
}

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
      externalLogoUrl: "https://cdn.example/concordia.png",
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

function homeBinningenMatch(): MatchcenterMatchSummary {
  const base = concordiaAwayMatch();
  return {
    ...base,
    id: "match-binningen-home",
    title: "FC Allschwil Junioren B1 vs SC Binningen a",
    homeAway: "HOME",
    location: "Im Brüel, Allschwil",
    home: {
      ...base.away,
      isOwnTeam: true,
    },
    away: {
      providerTeamId: 60002,
      providerTeamName: "SC Binningen a",
      canonicalTeamId: "team-binningen",
      canonicalTeamName: "SC Binningen a",
      displayName: "SC Binningen a",
      resolution: "RESOLVED",
      isOwnTeam: false,
      externalLogoUrl: "https://cdn.example/binningen.png",
    },
  };
}

describe("SCE-ACTIVITY-CREATE-01I-R6 — calendar MICRO football identity", () => {
  it("A/B: TEAM scope resolves HOME and AWAY opponents from canonical ids", () => {
    const awayFixture = resolveSceMatchPresentation({
      match: concordiaAwayMatch(),
      tenantLogoUrl: TENANT_LOGO,
      tenantClubName: "FC Allschwil",
    });
    const awayResolved = resolveTeamScopeMatchOpponent(awayFixture.fixture, FCA_B1_TEAM_ID);
    expect(awayResolved?.currentSide).toBe("AWAY");
    expect(formatTeamScopeMatchMicroIdentityLabel(awayResolved!.opponent)).toBe("FC Concordia Basel b");

    const homeFixture = resolveSceMatchPresentation({
      match: homeBinningenMatch(),
      tenantLogoUrl: TENANT_LOGO,
      tenantClubName: "FC Allschwil",
    });
    const homeResolved = resolveTeamScopeMatchOpponent(homeFixture.fixture, FCA_B1_TEAM_ID);
    expect(homeResolved?.currentSide).toBe("HOME");
    expect(formatTeamScopeMatchMicroIdentityLabel(homeResolved!.opponent)).toBe("SC Binningen a");
  });

  it("E: scope team is never its own opponent", () => {
    const entry = buildProgrammeCalendarMicroEntry(matchItem(concordiaAwayMatch(), FCA_B1_TEAM_ID), FMT);
    expect(entry.identityLabel).not.toMatch(/Junioren B1/i);
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
  });

  it("B1 away match: opponent crest when provider logo resolves", () => {
    const entry = buildProgrammeCalendarMicroEntry(matchItem(concordiaAwayMatch(), FCA_B1_TEAM_ID), FMT);
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Concordia Basel b");
    expect(entry.accessibleLabel).toContain("gegen FC Concordia Basel b");
    expect(entry.locationLabel).toContain("Sportanlagen St. Jakob");
  });

  it("D: missing crest keeps text identity without visualIdentity", () => {
    const match = concordiaAwayMatch();
    match.home.externalLogoUrl = null;
    const entry = buildProgrammeCalendarMicroEntry(matchItem(match, FCA_B1_TEAM_ID), FMT);
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
    expect(entry.visualIdentity).toBeUndefined();
  });

  it("C: external opponent without canonical SCE team retains provider display name", () => {
    const entry = buildProgrammeCalendarMicroEntry(matchItem(concordiaAwayMatch(), FCA_B1_TEAM_ID), FMT);
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
  });

  it("H/I: tournament organiser crest for tenant and external organiser", () => {
    const externalOrganiser = buildClubIdentity({
      displayName: "FC Arisdorf",
      logoUrl: "https://cdn.example/arisdorf.png",
    });
    const tenantOrganiser = buildClubIdentity({
      displayName: "FC Allschwil",
      logoUrl: TENANT_LOGO,
    });

    for (const organiser of [externalOrganiser, tenantOrganiser]) {
      const entry = buildProgrammeCalendarMicroEntry(
        {
          id: "TOURNAMENT:t1",
          kind: "TOURNAMENT",
          domainId: "t1",
          resourceKey: "tournament:t1",
          startsAt: new Date("2026-10-09T07:30:00.000Z"),
          endsAt: null,
          allDay: false,
          presentation: {
            kind: "TOURNAMENT",
            activityId: "t1",
            resourceKey: "tournament:t1",
            typeLabel: "Turnier",
            tournamentTitle: "PlayMore Turnier",
            organiser,
            schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
            location: buildSportingActivityLocation({
              mode: "AWAY",
              hostOrOrganiser: organiser.displayName,
              venueName: "Gemeindesportplatz",
            }),
            route: { resourceKey: "rk", consumeHref: "/to", manageHref: null },
          },
          teamId: FCA_B1_TEAM_ID,
          teamSeasonId: null,
          orgUnitId: null,
          navigationTarget: "/tournament/t1",
        },
        FMT,
      );
      expect(entry.identityLabel).toBe("PlayMore Turnier");
      expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    }
  });

  it("J: tournament without organiser crest has no visualIdentity pollution", () => {
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "TOURNAMENT:t2",
        kind: "TOURNAMENT",
        domainId: "t2",
        resourceKey: "tournament:t2",
        startsAt: new Date("2026-10-09T07:30:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: {
          kind: "TOURNAMENT",
          activityId: "t2",
          resourceKey: "tournament:t2",
          typeLabel: "Turnier",
          tournamentTitle: "Herbstcup",
          organiser: buildClubIdentity({ displayName: "SCE" }),
          schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
          location: buildSportingActivityLocation({ mode: "HOME", venueName: "Arena" }),
          route: { resourceKey: "rk", consumeHref: "/to", manageHref: null },
        },
        teamId: null,
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/tournament/t2",
      },
      FMT,
    );
    expect(entry.identityLabel).toBe("Herbstcup");
    expect(entry.visualIdentity).toBeUndefined();
  });

  it("K–M: training keeps team identity, single location, no crest", () => {
    const presentation = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: "Kunstrasen 2",
        facilityResource: "Kunstrasen 2 B",
      }),
    });
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "TRAINING:tr1",
        kind: "TRAINING",
        domainId: "tr1",
        resourceKey: "training:tr1",
        startsAt: new Date("2026-10-20T16:45:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation,
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: "ts",
        orgUnitId: null,
        navigationTarget: "/training/tr1",
      },
      FMT,
    );
    expect(entry.identityLabel).toBe("FC Allschwil Junioren B1");
    expect(entry.locationLabel).toBe("Kunstrasen 2 B");
    expect(entry.visualIdentity).toBeUndefined();
  });

  it("G: PERSON scope match uses fixture line from presentation participants", () => {
    const item: NormalizedCalendarItem = {
      id: "event:1",
      sourceType: "event",
      sourceId: "1",
      semanticType: "MATCH",
      title: "FC Concordia Basel b vs FC Allschwil Junioren B1",
      startAt: new Date("2026-10-17T13:00:00.000Z"),
      endAt: null,
      allDay: false,
      opponentName: "FC Concordia Basel b",
      homeAway: "AWAY",
      team: { name: "FC Allschwil Junioren B1" },
      location: "Sportanlagen St. Jakob",
      deepLink: "/match/1",
      iconKey: "match",
      typeLabel: "Spiel",
      ariaLabel: "Spiel",
      activityPresentation: {
        identity: {
          resourceKey: "event:1",
          title: "FC Concordia Basel b vs FC Allschwil Junioren B1",
          typeLabel: "Spiel",
          activityKind: "MATCH",
        },
        schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
        participants: {
          fixtureLine: "FC Concordia Basel b – FC Allschwil Junioren B1",
          opponentName: "FC Concordia Basel b",
          homeAway: "AWAY",
        },
        location: buildSportingActivityLocation({
          mode: "AWAY",
          venueName: "Sportanlagen St. Jakob",
        }),
      },
    };
    const entry = buildPersonalCalendarMicroEntry(item, FMT, {});
    expect(entry.identityLabel).toBe("FC Concordia Basel b – FC Allschwil Junioren B1");
  });
});
