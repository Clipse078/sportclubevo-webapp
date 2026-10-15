import { describe, expect, it } from "vitest";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildTrainingActivityPresentation } from "@/lib/sporting-activity-presentation/builders";
import { createSceTrainingCardFixtureSession } from "@/components/sporting-activity/__fixtures__/sce-training-card-fixtures";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import {
  buildPersonalCalendarMicroEntry,
} from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import {
  buildProgrammeCalendarMicroEntry,
  type ProgrammeCalendarMicroEntry,
} from "@/lib/programme-engine/programme-calendar-presentation";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { visibleCalendarMicroSemanticValues } from "../calendar-micro-semantics";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

function programmeTrainingItem(
  presentation: ProgrammeItem["presentation"],
  startsAt = new Date("2026-10-20T16:45:00.000Z"),
): ProgrammeItem {
  return {
    id: "training-1",
    kind: "TRAINING",
    domainId: "d1",
    resourceKey: "rk-1",
    startsAt,
    endsAt: null,
    allDay: false,
    presentation,
    teamId: "team-1",
    teamSeasonId: "ts-1",
    orgUnitId: null,
    navigationTarget: "/training/1",
  };
}

function normalizedTrainingItem(input: {
  id: string;
  teamName: string;
  startAt: Date;
  location?: string;
  activityPresentation?: NormalizedCalendarItem["activityPresentation"];
}): NormalizedCalendarItem {
  return {
    id: input.id,
    sourceType: "training-session",
    sourceId: input.id,
    semanticType: "TRAINING",
    title: input.location ?? input.teamName,
    startAt: input.startAt,
    endAt: null,
    allDay: false,
    team: { name: input.teamName },
    location: input.location,
    deepLink: `/training/${input.id}`,
    iconKey: "training",
    typeLabel: "Training",
    ariaLabel: input.teamName,
    activityPresentation: input.activityPresentation,
  };
}

function visibleValues(entry: ProgrammeCalendarMicroEntry): string[] {
  return visibleCalendarMicroSemanticValues({
    typeLabel: entry.typeLabel,
    timeLabel: entry.timeLabel,
    identityLabel: entry.identityLabel,
    locationLabel: entry.locationLabel,
  });
}

function countSubstringInVisible(entry: ProgrammeCalendarMicroEntry, needle: string): number {
  const norm = needle.trim().toLowerCase();
  return visibleValues(entry).filter((value) => value.toLowerCase().includes(norm)).length;
}

describe("SCE-ACTIVITY-CREATE-01I-R5 — calendar MICRO information hierarchy", () => {
  it("team programme training: identity = team, location compact once", () => {
    const presentation = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: "Kunstrasen 2",
        facilityResource: "Kunstrasen 2 B",
      }),
    });
    const entry = buildProgrammeCalendarMicroEntry(programmeTrainingItem(presentation), FMT);

    expect(entry.typeLabel).toBe("TRAINING");
    expect(entry.timeLabel).toMatch(/18:45/);
    expect(entry.identityLabel).toBe("FC Allschwil Junioren B1");
    expect(entry.locationLabel).toBe("Kunstrasen 2 B");
    expect(countSubstringInVisible(entry, "Kunstrasen 2 B")).toBe(1);
    expect(visibleValues(entry).join(" ")).not.toContain("Kunstrasen 2 ·");
  });

  it("personal calendar: multiple teams retain distinct identity", () => {
    const f2Presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:f2",
      title: "FC Allschwil Junioren F2",
      typeLabel: "Training",
      teamName: "FC Allschwil Junioren F2",
      startAt: new Date("2026-10-15T15:00:00.000Z"),
      facilityName: "Hauptfeld",
      pitchResourceName: "Hauptfeld A",
    });
    const b1Presentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:b1",
      title: "FC Allschwil Junioren B1",
      typeLabel: "Training",
      teamName: "FC Allschwil Junioren B1",
      startAt: new Date("2026-10-15T16:45:00.000Z"),
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 B",
    });
    const seniorenPresentation = buildTrainingActivityPresentation({
      resourceKey: "training-session:sen",
      title: "Senioren 40+",
      typeLabel: "Training",
      teamName: "Senioren 40+",
      startAt: new Date("2026-10-15T17:00:00.000Z"),
      facilityName: "Kunstrasen 2",
      pitchResourceName: "Kunstrasen 2 B",
    });

    const f2 = buildPersonalCalendarMicroEntry(
      normalizedTrainingItem({
        id: "f2",
        teamName: "FC Allschwil Junioren F2",
        startAt: new Date("2026-10-15T15:00:00.000Z"),
        location: "Hauptfeld Hauptfeld A",
        activityPresentation: f2Presentation,
      }),
      FMT,
      { f2: "17:00" },
    );
    const b1 = buildPersonalCalendarMicroEntry(
      normalizedTrainingItem({
        id: "b1",
        teamName: "FC Allschwil Junioren B1",
        startAt: new Date("2026-10-15T16:45:00.000Z"),
        location: "Kunstrasen 2 Kunstrasen 2 B",
        activityPresentation: b1Presentation,
      }),
      FMT,
      { b1: "18:45" },
    );
    const sen = buildPersonalCalendarMicroEntry(
      normalizedTrainingItem({
        id: "sen",
        teamName: "Senioren 40+",
        startAt: new Date("2026-10-15T17:00:00.000Z"),
        activityPresentation: seniorenPresentation,
      }),
      FMT,
      { sen: "19:00" },
    );

    expect(f2.identityLabel).toBe("FC Allschwil Junioren F2");
    expect(f2.locationLabel).toBe("Hauptfeld A");
    expect(b1.identityLabel).toBe("FC Allschwil Junioren B1");
    expect(b1.locationLabel).toBe("Kunstrasen 2 B");
    expect(sen.identityLabel).toBe("Senioren 40+");
    expect(sen.locationLabel).toBe("Kunstrasen 2 B");
    expect(new Set([f2.identityLabel, b1.identityLabel, sen.identityLabel]).size).toBe(3);
  });

  it("training duplication guard: each semantic field owned once", () => {
    const presentation = createSceTrainingCardFixtureSession({
      team: { name: "FC Allschwil Junioren B1" },
      location: buildSportingActivityLocation({
        mode: "HOME",
        venueName: "Kunstrasen 2",
        facilityResource: "Kunstrasen 2 B",
      }),
    });
    const programmeEntry = buildProgrammeCalendarMicroEntry(programmeTrainingItem(presentation), FMT);
    const personalEntry = buildPersonalCalendarMicroEntry(
      normalizedTrainingItem({
        id: "dup",
        teamName: "FC Allschwil Junioren B1",
        startAt: new Date("2026-10-20T16:45:00.000Z"),
        activityPresentation: buildTrainingActivityPresentation({
          resourceKey: "training-session:dup",
          title: "FC Allschwil Junioren B1",
          typeLabel: "Training",
          teamName: "FC Allschwil Junioren B1",
          startAt: new Date("2026-10-20T16:45:00.000Z"),
          facilityName: "Kunstrasen 2",
          pitchResourceName: "Kunstrasen 2 B",
        }),
      }),
      FMT,
      {},
    );

    for (const entry of [programmeEntry, personalEntry]) {
      expect(countSubstringInVisible(entry, "TRAINING")).toBe(1);
      expect(countSubstringInVisible(entry, "FC Allschwil Junioren B1")).toBe(1);
      expect(countSubstringInVisible(entry, "Kunstrasen 2 B")).toBe(1);
      expect(visibleValues(entry).join(" ")).not.toMatch(/Kunstrasen 2\s+Kunstrasen 2 B/);
    }
  });

  it("match micro: fixture identity and location once", () => {
    const matchModel = resolveSceMatchCardFixture({ homeAway: "HOME" });
    const programmeEntry = buildProgrammeCalendarMicroEntry(
      {
        id: "m1",
        kind: "MATCH",
        domainId: "m1",
        resourceKey: "rk-m1",
        startsAt: new Date("2026-10-17T12:00:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: matchModel,
        teamId: "team-1",
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/match/1",
      },
      FMT,
    );
    expect(programmeEntry.typeLabel).toBe("SPIEL");
    expect(programmeEntry.identityLabel).toBe("FC Therwil");
    expect(programmeEntry.locationLabel).toBeTruthy();
    expect(countSubstringInVisible(programmeEntry, programmeEntry.locationLabel!)).toBe(1);
  });

  it("tournament and club event preserve titles without fake team", () => {
    const tournamentPresentation = {
      kind: "TOURNAMENT" as const,
      activityId: "to1",
      resourceKey: "rk-to1",
      typeLabel: "Turnier",
      tournamentTitle: "Herbstcup",
      organiser: {
        displayName: "SCE",
        logoUrl: null,
        fallbackIdentity: { kind: "initials" as const, label: "SC" },
      },
      schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
      location: buildSportingActivityLocation({ mode: "HOME", venueName: "Arena" }),
      route: { resourceKey: "rk", consumeHref: "/to", manageHref: null },
    };
    const tournament = buildProgrammeCalendarMicroEntry(
      {
        id: "to1",
        kind: "TOURNAMENT",
        domainId: "to1",
        resourceKey: "rk-to1",
        startsAt: new Date("2026-10-11T07:30:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: tournamentPresentation,
        teamId: null,
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/to/1",
      },
      FMT,
    );
    expect(tournament.identityLabel).toBe("Herbstcup");
    expect(tournament.locationLabel).toBe("Arena");

    const eventEntry = buildProgrammeCalendarMicroEntry(
      {
        id: "ev1",
        kind: "CLUB_EVENT",
        domainId: "ev1",
        resourceKey: "rk-ev1",
        startsAt: new Date("2026-10-05T17:30:00.000Z"),
        endsAt: null,
        allDay: false,
        presentation: {
          kind: "CLUB_EVENT",
          activityId: "ev1",
          resourceKey: "rk-ev1",
          typeLabel: "Veranstaltung",
          eventTitle: "118. Mitgliederversammlung",
          schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
          location: buildSportingActivityLocation({ mode: "HOME", venueName: "Clubhaus" }),
          route: { resourceKey: "rk", consumeHref: "/ev", manageHref: null },
        },
        teamId: null,
        teamSeasonId: null,
        orgUnitId: null,
        navigationTarget: "/ev/1",
      },
      FMT,
    );
    expect(eventEntry.identityLabel).toBe("118. Mitgliederversammlung");
    expect(eventEntry.identityLabel).not.toMatch(/Junioren/i);
  });

  it("task micro: title only, no sporting metadata", () => {
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
    expect(task.typeLabel).toBe("AUFGABE");
    expect(task.timeLabel).toBe("Fällig");
    expect(task.identityLabel).toBe("Test");
    expect(task.locationLabel).toBeUndefined();
  });
});
