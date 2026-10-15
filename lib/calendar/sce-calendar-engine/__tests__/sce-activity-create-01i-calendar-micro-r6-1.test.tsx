/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { ProgrammeCalendarMicroEntry } from "@/components/programme/ProgrammeCalendarMicroEntry";
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
  buildTrainingActivityPresentation,
} from "@/lib/sporting-activity-presentation/builders";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import {
  visibleCalendarMicroSemanticValues,
} from "../calendar-micro-semantics";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const FCA_B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const TENANT_LOGO = "https://cdn.example/fca.png";

function matchItem(match: MatchcenterMatchSummary, teamId: string): ProgrammeItem {
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
  };
}

function countOpponentInVisible(entry: ReturnType<typeof buildProgrammeCalendarMicroEntry>, opponent: string): number {
  const needle = opponent.toLowerCase();
  return visibleCalendarMicroSemanticValues(entry).filter((value) =>
    value.toLowerCase().includes(needle),
  ).length;
}

describe("SCE-ACTIVITY-CREATE-01I-R6.1 — canonical MICRO visual language", () => {
  it("match: opponent once, location-only, icons in renderer", () => {
    const entry = buildProgrammeCalendarMicroEntry(matchItem(concordiaAwayMatch(), FCA_B1_TEAM_ID), FMT);
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
    expect(entry.locationLabel).toBe("Sportanlagen St. Jakob, Basel - wird vor Ort zugeteilt");
    expect(entry.locationLabel).not.toContain("FC Concordia Basel b");
    expect(countOpponentInVisible(entry, "FC Concordia Basel b")).toBe(1);
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");

    const { container } = render(<ProgrammeCalendarMicroEntry entry={entry} />);
    expect(container.querySelector('[data-testid="sce-calendar-micro-time"] svg')).toBeTruthy();
    expect(container.querySelector('[data-testid="sce-calendar-micro-location"] svg')).toBeTruthy();
  });

  it("training: tenant crest from canonical tenantClub", () => {
    const presentation = {
      ...createSceTrainingCardFixtureSession({
        team: { name: "Junioren B1" },
        location: buildSportingActivityLocation({
          mode: "HOME",
          hostOrOrganiser: "FC Allschwil",
          venueName: "Kunstrasen 2",
          facilityResource: "Kunstrasen 2 B",
        }),
      }),
      tenantClub: buildClubIdentity({
        displayName: "FC Allschwil",
        logoUrl: TENANT_LOGO,
      }),
    };
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
    expect(entry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(entry.identityLabel).toBe("Junioren B1");
    expect(entry.locationLabel).toBe("Kunstrasen 2 B");
  });

  it("tournament: organiser crest + location-only (programme + personal)", () => {
    const organiser = buildClubIdentity({
      displayName: "FC Arisdorf",
      logoUrl: "https://cdn.example/arisdorf.png",
    });
    const programmeEntry = buildProgrammeCalendarMicroEntry(
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
            hostOrOrganiser: "FC Arisdorf",
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
    expect(programmeEntry.identityLabel).toBe("PlayMore Turnier");
    expect(programmeEntry.locationLabel).toBe("Gemeindesportplatz");
    expect(programmeEntry.visualIdentity?.identity.displayName).toBe("FC Arisdorf");

    const tournamentPresentation: SportingActivityPresentation = {
      identity: {
        resourceKey: "event:t1",
        title: "PlayMore Turnier",
        typeLabel: "Turnier",
        activityKind: "TOURNAMENT",
      },
      schedule: {
        startAt: new Date("2026-10-09T07:30:00.000Z").toISOString(),
        endAt: null,
        allDay: false,
      },
      location: buildSportingActivityLocation({
        mode: "AWAY",
        hostOrOrganiser: "FC Arisdorf",
        venueName: "Gemeindesportplatz",
      }),
      context: {
        organiser: "FC Arisdorf",
        organiserLogoUrl: "https://cdn.example/arisdorf.png",
      },
    };
    const personalItem: NormalizedCalendarItem = {
      id: "event:t1",
      sourceType: "event",
      sourceId: "t1",
      semanticType: "TOURNAMENT",
      title: "PlayMore Turnier",
      startAt: new Date("2026-10-09T07:30:00.000Z"),
      endAt: null,
      allDay: false,
      location: "FC Arisdorf · Gemeindesportplatz",
      deepLink: "/tournament/t1",
      iconKey: "tournament",
      typeLabel: "Turnier",
      ariaLabel: "Turnier",
      activityPresentation: tournamentPresentation,
    };
    const personalEntry = buildPersonalCalendarMicroEntry(personalItem, FMT, {});
    expect(personalEntry.identityLabel).toBe("PlayMore Turnier");
    expect(personalEntry.locationLabel).toBe("Gemeindesportplatz");
    expect(personalEntry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(personalEntry.accessibleLabel).toContain("organisiert von FC Arisdorf");
  });

  it("personal training carries tenant crest via presentation tenantClub logo", () => {
    const activityPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:b1",
      title: "Training",
      typeLabel: "Training",
      teamName: "Junioren B1",
      clubName: "FC Allschwil",
      tenantClubLogoUrl: TENANT_LOGO,
      startAt: new Date("2026-10-15T16:45:00.000Z"),
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 B",
    });
    const personalEntry = buildPersonalCalendarMicroEntry(
      {
        id: "training-session:b1",
        sourceType: "training-session",
        sourceId: "b1",
        semanticType: "TRAINING",
        title: "Training",
        startAt: new Date("2026-10-15T16:45:00.000Z"),
        allDay: false,
        team: { name: "Junioren B1" },
        deepLink: "/training/b1",
        iconKey: "training",
        typeLabel: "Training",
        ariaLabel: "Training",
        activityPresentation,
      },
      FMT,
      {},
    );
    expect(personalEntry.visualIdentity?.kind).toBe("CLUB_CREST");
    expect(personalEntry.identityLabel).toBe("Junioren B1");
    expect(personalEntry.locationLabel).toBe("Kunstrasen 2 B");
  });

  it("architecture: one engine shell and one MICRO renderer", () => {
    const repoRoot = join(process.cwd());
    const personalWorkspace = readFileSync(
      join(repoRoot, "components/admin/kalender/PersonalKalenderMonthWorkspace.tsx"),
      "utf8",
    );
    const programmeView = readFileSync(
      join(repoRoot, "components/programme/ProgrammeCalendarView.tsx"),
      "utf8",
    );
    const monthGrid = readFileSync(
      join(repoRoot, "components/ui/calendar/MonthActivityGrid.tsx"),
      "utf8",
    );
    expect(personalWorkspace).toContain("SceCalendarEngine");
    expect(programmeView).toContain("SceCalendarEngine");
    expect(personalWorkspace).toContain("buildPersonalCalendarDayPresentation");
    expect(programmeView).toContain("buildProgrammeCalendarDayPresentation");
    expect(monthGrid).toContain("ProgrammeCalendarMicroEntry");
    expect(monthGrid).not.toMatch(/PersonalCalendarTrainingTile|MatchCalendarTile/);
  });
});
