/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { buildClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveSceMatchPresentation } from "@/lib/sporting-activity-presentation/canonical";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { ProgrammeCalendarMicroEntry } from "@/components/programme/ProgrammeCalendarMicroEntry";
import {
  buildCalendarMicroAccessibleLabel,
  visibleCalendarMicroSemanticValues,
} from "../calendar-micro-semantics";
import {
  formatCalendarMicroAccessibleTimePhrase,
  formatCalendarMicroTimeLabel,
} from "../calendar-micro-time-label";
import {
  buildPersonalCalendarMicroEntry,
} from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import { buildCalendarTimeLabelById } from "@/lib/personal-agenda/build-calendar-time-labels";
import {
  buildProgrammeCalendarMicroEntry,
} from "@/lib/programme-engine/programme-calendar-presentation";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const FCA_B1_TEAM_ID = "cmrkh1mb1000i04jurtajh262";
const TENANT_LOGO = "https://cdn.example/fca.png";

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

function trainingProgrammeItem(overrides: {
  startsAt: Date;
  endsAt?: Date | null;
}): ProgrammeItem {
  return {
    id: "TRAINING:tr1",
    kind: "TRAINING",
    domainId: "tr1",
    resourceKey: "training:tr1",
    startsAt: overrides.startsAt,
    endsAt: overrides.endsAt ?? null,
    allDay: false,
    presentation: {
      ...createSceTrainingCardFixtureSession({
        team: { name: "FC Allschwil Junioren B1" },
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
    },
    teamId: "team-1",
    teamSeasonId: "ts",
    orgUnitId: null,
    navigationTarget: "/training/tr1",
  };
}

function normalizedFromProgrammeInterval(input: {
  startsAt: Date;
  endsAt?: Date | null;
  semanticType?: NormalizedCalendarItem["semanticType"];
}): NormalizedCalendarItem {
  return {
    id: "training-session:tr1",
    sourceType: "training-session",
    sourceId: "tr1",
    semanticType: input.semanticType ?? "TRAINING",
    title: "FC Allschwil Junioren B1",
    startAt: input.startsAt,
    endAt: input.endsAt ?? null,
    allDay: false,
    team: { name: "FC Allschwil Junioren B1" },
    location: "Kunstrasen 2 B",
    deepLink: "/training/tr1",
    iconKey: "training",
    typeLabel: "Training",
    ariaLabel: "Training",
  };
}

describe("SCE-ACTIVITY-CREATE-01I-R6.3 — canonical MICRO time range", () => {
  it("shared formatter: start + end uses en dash without spaces", () => {
    expect(
      formatCalendarMicroTimeLabel({
        allDay: false,
        startAt: new Date("2026-10-20T16:45:00.000Z"),
        endAt: new Date("2026-10-20T18:15:00.000Z"),
        fmtCfg: FMT,
      }),
    ).toBe("18:45–20:15");
    expect(formatCalendarMicroTimeLabel({
      allDay: false,
      startAt: new Date("2026-10-20T16:45:00.000Z"),
      endAt: null,
      fmtCfg: FMT,
    })).toBe("18:45");
  });

  it("accessible time phrase uses «bis» for ranges", () => {
    expect(formatCalendarMicroAccessibleTimePhrase("18:45–20:15")).toBe("18:45 bis 20:15");
    const label = buildCalendarMicroAccessibleLabel({
      typeLabel: "TRAINING",
      identityLabel: "FC Allschwil Junioren B1",
      timeLabel: "18:45–20:15",
      locationLabel: "Kunstrasen 2 B",
    });
    expect(label).toBe("TRAINING, FC Allschwil Junioren B1, 18:45 bis 20:15, Kunstrasen 2 B");
  });

  it("TRAINING: programme MICRO shows occurrence start–end", () => {
    const entry = buildProgrammeCalendarMicroEntry(
      trainingProgrammeItem({
        startsAt: new Date("2026-10-20T16:45:00.000Z"),
        endsAt: new Date("2026-10-20T18:15:00.000Z"),
      }),
      FMT,
    );
    expect(entry.timeLabel).toBe("18:45–20:15");
    expect(entry.identityLabel).toBe("FC Allschwil Junioren B1");
    expect(entry.locationLabel).toBe("Kunstrasen 2 B");
  });

  it("TRAINING: different occurrence end is respected (not series default)", () => {
    const shortSession = buildProgrammeCalendarMicroEntry(
      trainingProgrammeItem({
        startsAt: new Date("2026-10-21T16:45:00.000Z"),
        endsAt: new Date("2026-10-21T17:30:00.000Z"),
      }),
      FMT,
    );
    expect(shortSession.timeLabel).toBe("18:45–19:30");
  });

  it("MATCH: kickoff only — no fabricated end from operational duration", () => {
    const presentation = resolveSceMatchPresentation({
      match: concordiaAwayMatch(),
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: TENANT_LOGO,
    });
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "MATCH:m1",
        kind: "MATCH",
        domainId: "m1",
        resourceKey: "event:m1",
        startsAt: concordiaAwayMatch().startAt,
        endsAt: null,
        allDay: false,
        presentation,
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: "ts-b1",
        orgUnitId: null,
        navigationTarget: "/match/m1",
      },
      FMT,
    );
    expect(entry.timeLabel).toBe("15:00");
    expect(entry.identityLabel).toBe("FC Concordia Basel b");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Concordia Basel b");
  });

  it("MATCH: authoritative endAt shows shared range formatter", () => {
    const presentation = resolveSceMatchPresentation({
      match: concordiaAwayMatch(),
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: TENANT_LOGO,
    });
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "MATCH:m2",
        kind: "MATCH",
        domainId: "m2",
        resourceKey: "event:m2",
        startsAt: new Date("2026-10-17T13:00:00.000Z"),
        endsAt: new Date("2026-10-17T15:00:00.000Z"),
        allDay: false,
        presentation,
        teamId: FCA_B1_TEAM_ID,
        teamSeasonId: "ts-b1",
        orgUnitId: null,
        navigationTarget: "/match/m2",
      },
      FMT,
    );
    expect(entry.timeLabel).toBe("15:00–17:00");
  });

  it("TOURNAMENT: start + end range; organiser crest unchanged", () => {
    const organiser = buildClubIdentity({
      displayName: "FC Arisdorf",
      logoUrl: "https://cdn.example/arisdorf.png",
    });
    const entry = buildProgrammeCalendarMicroEntry(
      {
        id: "TOURNAMENT:t1",
        kind: "TOURNAMENT",
        domainId: "t1",
        resourceKey: "tournament:t1",
        startsAt: new Date("2026-10-09T07:30:00.000Z"),
        endsAt: new Date("2026-10-09T09:30:00.000Z"),
        allDay: false,
        presentation: {
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
    expect(entry.timeLabel).toBe("09:30–11:30");
    expect(entry.identityLabel).toBe("PlayMore Turnier");
    expect(entry.visualIdentity?.identity.displayName).toBe("FC Arisdorf");
  });

  it("CLUB_EVENT: start + end, start only, and all-day", () => {
    const clubEventBase: ProgrammeItem = {
      id: "CLUB_EVENT:ev1",
      kind: "CLUB_EVENT",
      domainId: "ev1",
      resourceKey: "rk-ev1",
      startsAt: new Date("2026-10-05T17:00:00.000Z"),
      endsAt: new Date("2026-10-05T19:00:00.000Z"),
      allDay: false,
      presentation: {
        kind: "CLUB_EVENT",
        activityId: "ev1",
        resourceKey: "rk-ev1",
        typeLabel: "Veranstaltung",
        eventTitle: "118. Mitgliederversammlung",
        schedule: {
          startAt: new Date("2026-10-05T17:00:00.000Z").toISOString(),
          endAt: new Date("2026-10-05T19:00:00.000Z").toISOString(),
          allDay: false,
        },
        location: buildSportingActivityLocation({
          mode: "HOME",
          venueName: "Saal (Schulhaus) Gartenhof",
        }),
        route: { resourceKey: "rk", consumeHref: "/ev", manageHref: null },
      },
      teamId: null,
      teamSeasonId: null,
      orgUnitId: null,
      navigationTarget: "/ev/1",
    };

    const withEnd = buildProgrammeCalendarMicroEntry(clubEventBase, FMT);
    expect(withEnd.timeLabel).toBe("19:00–21:00");

    const startOnly = buildProgrammeCalendarMicroEntry(
      { ...clubEventBase, id: "CLUB_EVENT:ev2", endsAt: null },
      FMT,
    );
    expect(startOnly.timeLabel).toBe("19:00");

    const allDay = buildProgrammeCalendarMicroEntry(
      { ...clubEventBase, id: "CLUB_EVENT:ev3", allDay: true },
      FMT,
    );
    expect(allDay.timeLabel).toBe("Ganztägig");
  });

  it("PERSONAL CALENDAR: same interval as programme yields identical timeLabel", () => {
    const startsAt = new Date("2026-10-20T16:45:00.000Z");
    const endsAt = new Date("2026-10-20T18:15:00.000Z");
    const programme = buildProgrammeCalendarMicroEntry(
      trainingProgrammeItem({ startsAt, endsAt }),
      FMT,
    );
    const personal = buildPersonalCalendarMicroEntry(
      normalizedFromProgrammeInterval({ startsAt, endsAt }),
      FMT,
      {},
    );
    expect(personal.timeLabel).toBe(programme.timeLabel);
    expect(personal.timeLabel).toBe("18:45–20:15");

    const map = buildCalendarTimeLabelById(
      [normalizedFromProgrammeInterval({ startsAt, endsAt })],
      FMT,
    );
    expect(map["training-session:tr1"]).toBe("18:45–20:15");
  });

  it("TASK deadline grammar preserved", () => {
    const task = buildPersonalCalendarMicroEntry(
      {
        id: "task:1",
        sourceType: "task",
        sourceId: "1",
        semanticType: "TASK",
        title: "Test",
        startAt: new Date("2026-10-10T00:00:00.000Z"),
        allDay: true,
        deepLink: "/tasks/1",
        iconKey: "tasks",
        typeLabel: "Aufgabe",
        ariaLabel: "Test",
      },
      FMT,
      {},
    );
    expect(task.timeLabel).toBe("Fällig");
  });

  it("TIMEZONE: start and end formatted in tenant Europe/Zurich", () => {
    const label = formatCalendarMicroTimeLabel({
      allDay: false,
      startAt: new Date("2026-03-29T12:30:00.000Z"),
      endAt: new Date("2026-03-29T14:00:00.000Z"),
      fmtCfg: FMT,
    });
    expect(label).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
    expect(label).not.toContain(" ");
  });

  it("REGRESSION R6.2: identity-first DOM order and Clock/MapPin meta rows", () => {
    const entry = buildProgrammeCalendarMicroEntry(
      trainingProgrammeItem({
        startsAt: new Date("2026-10-20T16:45:00.000Z"),
        endsAt: new Date("2026-10-20T18:15:00.000Z"),
      }),
      FMT,
    );
    const { container } = render(<ProgrammeCalendarMicroEntry entry={entry} />);
    const link = container.querySelector("a");
    expect(link).toBeTruthy();
    const children = Array.from(link!.children);
    expect(children[0].textContent).toBe("TRAINING");
    expect(children[1].getAttribute("data-testid")).toBe("sce-calendar-micro-identity");
    expect(children[2].getAttribute("data-testid")).toBe("sce-calendar-micro-time");
    expect(children[3].getAttribute("data-testid")).toBe("sce-calendar-micro-location");
    expect(container.querySelector('[data-testid="sce-calendar-micro-time"] svg')).toBeTruthy();
    expect(container.querySelector('[data-testid="sce-calendar-micro-location"] svg')).toBeTruthy();
    expect(visibleCalendarMicroSemanticValues(entry)).toEqual([
      "TRAINING",
      "FC Allschwil Junioren B1",
      "18:45–20:15",
      "Kunstrasen 2 B",
    ]);
  });
});
