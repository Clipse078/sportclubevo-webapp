/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { buildMonthGridCells, buildMonthGridDates } from "@/lib/calendar/month-grid";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { groupProgrammeItemsByDay, programmeItemDayKey } from "@/lib/programme-engine/programme-day-key";
import {
  buildProgrammeCalendarDayPresentation,
  buildProgrammeCalendarMicroEntry,
} from "@/lib/programme-engine/programme-calendar-presentation";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import ProgrammeCalendarView from "@/components/programme/ProgrammeCalendarView";
import { resolveSceMatchCardFixture } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };
const TZ = "Europe/Zurich";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function fixtureItem(
  partial: Pick<ProgrammeItem, "id" | "kind" | "startsAt"> &
    Partial<Omit<ProgrammeItem, "id" | "kind" | "startsAt">>,
): ProgrammeItem {
  const base: ProgrammeItem = {
    id: partial.id,
    kind: partial.kind,
    domainId: partial.domainId ?? partial.id,
    resourceKey: partial.resourceKey ?? `rk-${partial.id}`,
    startsAt: partial.startsAt,
    endsAt: partial.endsAt ?? null,
    allDay: partial.allDay ?? false,
    presentation: partial.presentation!,
    teamId: partial.teamId ?? null,
    teamSeasonId: partial.teamSeasonId ?? null,
    orgUnitId: partial.orgUnitId ?? null,
    navigationTarget: partial.navigationTarget ?? `/activity/${partial.id}`,
  };
  return base;
}

function trainingPresentation(teamName: string) {
  return {
    kind: "TRAINING" as const,
    activityId: "t1",
    resourceKey: "rk-t1",
    typeLabel: "Training",
    trainingTitle: "Training",
    team: { name: teamName },
    schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
    location: { label: "Platz" },
    route: { resourceKey: "rk", consumeHref: "/t", manageHref: null },
  };
}

function matchPresentation(startIso: string) {
  return resolveSceMatchCardFixture({
    startAt: new Date(startIso),
    homeAway: "HOME",
  });
}

function clubEventPresentation(title: string) {
  return {
    kind: "CLUB_EVENT" as const,
    activityId: "e1",
    resourceKey: "rk-e1",
    typeLabel: "Veranstaltung",
    eventTitle: title,
    schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
    location: { label: "Clubhaus" },
    route: { resourceKey: "rk", consumeHref: "/e", manageHref: null },
  };
}

function tournamentPresentation(title: string) {
  return {
    kind: "TOURNAMENT" as const,
    activityId: "to1",
    resourceKey: "rk-to1",
    typeLabel: "Turnier",
    tournamentTitle: title,
    organiser: { displayName: "SCE", logoUrl: null, fallbackIdentity: { kind: "initials" as const, label: "SC" } },
    schedule: { startAt: new Date().toISOString(), endAt: null, allDay: false },
    location: { label: "Arena" },
    route: { resourceKey: "rk", consumeHref: "/to", manageHref: null },
  };
}

describe("SCE-ACTIVITY-CREATE-01I-R2 — Programme Kalender", () => {
  it("A: calendar view consumes the same ProgrammeItem[] as Liste (no second query)", () => {
    const calendarView = readRelative("components/programme/ProgrammeCalendarView.tsx");
    const listeView = readRelative("components/programme/ProgrammeListeView.tsx");
    expect(calendarView).toContain("items: ProgrammeItem[]");
    expect(listeView).toContain("items: ProgrammeItem[]");
    expect(calendarView).not.toContain("queryProgramme");
    expect(calendarView).toContain("buildMonthGridCells");
  });

  it("G: grid day keys align with programmeItemDayKey via buildMonthGridCells", () => {
    const monthParam = "2026-10";
    const cells = buildMonthGridCells(monthParam, TZ);
    const itemKey = programmeItemDayKey(new Date("2026-10-20T15:00:00.000Z"), TZ);
    expect(cells.map((c) => c.dayKey)).toContain(itemKey);
    const cellForItem = cells.find((c) => c.dayKey === itemKey);
    expect(cellForItem?.inMonth).toBe(true);
    expect(buildMonthGridDates(monthParam).map((day) => matchDayKeyInTimezone(day, TZ))).toContain(
      itemKey,
    );
  });

  it("B–G: October programme items map to correct calendar days", () => {
    const items: ProgrammeItem[] = [
      fixtureItem({
        id: "training-2010",
        kind: "TRAINING",
        startsAt: new Date("2026-10-20T15:00:00.000Z"),
        presentation: trainingPresentation("Junioren B1"),
      }),
      fixtureItem({
        id: "match-1710",
        kind: "MATCH",
        startsAt: new Date("2026-10-17T12:00:00.000Z"),
        presentation: matchPresentation("2026-10-17T12:00:00.000Z"),
      }),
      fixtureItem({
        id: "match-2210",
        kind: "MATCH",
        startsAt: new Date("2026-10-22T16:30:00.000Z"),
        presentation: matchPresentation("2026-10-22T16:30:00.000Z"),
      }),
      fixtureItem({
        id: "event-0510",
        kind: "CLUB_EVENT",
        startsAt: new Date("2026-10-05T17:30:00.000Z"),
        presentation: clubEventPresentation("118. Mitgliederversammlung"),
      }),
      fixtureItem({
        id: "tournament-1110",
        kind: "TOURNAMENT",
        startsAt: new Date("2026-10-11T07:30:00.000Z"),
        presentation: tournamentPresentation("Herbstcup"),
      }),
    ];

    const grouped = groupProgrammeItemsByDay(items, TZ);
    expect(grouped.get("2026-10-20")?.[0]?.id).toBe("training-2010");
    expect(grouped.get("2026-10-17")?.[0]?.id).toBe("match-1710");
    expect(grouped.get("2026-10-22")?.[0]?.id).toBe("match-2210");
    expect(grouped.get("2026-10-05")?.[0]?.id).toBe("event-0510");
    expect(grouped.get("2026-10-11")?.[0]?.id).toBe("tournament-1110");

    const trainingDay = buildProgrammeCalendarDayPresentation(grouped.get("2026-10-20") ?? [], FMT);
    expect(trainingDay.entries[0]?.typeLabel).toBe("TRAINING");
    expect(trainingDay.entries[0]?.title).toContain("Junioren B1");

    const matchDay = buildProgrammeCalendarMicroEntry(items[1]!, FMT);
    expect(matchDay.typeLabel).toBe("SPIEL");
    expect(matchDay.title).toMatch(/^vs /);
  });

  it("H–J: ProgrammeCalendarView renders October activities in-month only", () => {
    const items: ProgrammeItem[] = [
      fixtureItem({
        id: "training-2010",
        kind: "TRAINING",
        startsAt: new Date("2026-10-20T15:00:00.000Z"),
        presentation: trainingPresentation("Junioren B1"),
      }),
      fixtureItem({
        id: "match-1710",
        kind: "MATCH",
        startsAt: new Date("2026-10-17T12:00:00.000Z"),
        presentation: matchPresentation("2026-10-17T12:00:00.000Z"),
      }),
      fixtureItem({
        id: "match-2210",
        kind: "MATCH",
        startsAt: new Date("2026-10-22T16:30:00.000Z"),
        presentation: matchPresentation("2026-10-22T16:30:00.000Z"),
      }),
      fixtureItem({
        id: "event-0510",
        kind: "CLUB_EVENT",
        startsAt: new Date("2026-10-05T17:30:00.000Z"),
        presentation: clubEventPresentation("118. Mitgliederversammlung"),
      }),
      fixtureItem({
        id: "tournament-1110",
        kind: "TOURNAMENT",
        startsAt: new Date("2026-10-11T07:30:00.000Z"),
        presentation: tournamentPresentation("Herbstcup"),
      }),
      fixtureItem({
        id: "match-sept",
        kind: "MATCH",
        startsAt: new Date("2026-09-30T10:00:00.000Z"),
        presentation: matchPresentation("2026-09-30T10:00:00.000Z"),
      }),
    ];

    render(
      <ProgrammeCalendarView
        items={items}
        monthParam="2026-10"
        timeZone={TZ}
        fmtCfg={FMT}
        previousMonthHref="/prev"
        nextMonthHref="/next"
        todayHref="/today"
      />,
    );

    expect(screen.getByTestId("programme-calendar-entry-training-2010")).toBeTruthy();
    expect(screen.getByTestId("programme-calendar-entry-match-1710")).toBeTruthy();
    expect(screen.getByTestId("programme-calendar-entry-match-2210")).toBeTruthy();
    expect(screen.getByTestId("programme-calendar-entry-event-0510")).toBeTruthy();
    expect(screen.getByTestId("programme-calendar-entry-tournament-1110")).toBeTruthy();

    const septDayCell = screen.getByTestId("programme-calendar-day-2026-09-30");
    expect(within(septDayCell).getByTestId("programme-calendar-entry-match-sept")).toBeTruthy();

    const octInMonthDay = screen.getByTestId("programme-calendar-day-2026-10-17");
    expect(within(octInMonthDay).queryByTestId("programme-calendar-entry-match-sept")).toBeNull();
  });
});

describe("SCE-ACTIVITY-CREATE-01I-R2 — Programme SceMatchCard", () => {
  it("uses canonical SceMatchCard with programme-fixture list row (HOME left, kickoff centre, crest bounds)", () => {
    const cardSource = readRelative("components/programme/ProgrammeSceActivityCard.tsx");
    expect(cardSource).toContain("SceMatchCard");
    expect(cardSource).toContain('listRowPresentation="programme-fixture"');
    expect(cardSource).not.toMatch(/ProgrammeMatchCard/);

    const model = resolveSceMatchCardFixture({ homeAway: "HOME" });
    const { container } = render(
      <SceMatchCard
        model={model}
        density="COMPACT"
        fmtCfg={FMT}
        surface="list-row"
        listRowPresentation="programme-fixture"
        linkToDetail={false}
      />,
    );

    const fixture = container.querySelector('[data-testid="sce-match-fixture"]');
    expect(fixture).toBeTruthy();
    const home = fixture!.querySelector('[data-sce-match-side="home"]');
    const away = fixture!.querySelector('[data-sce-match-side="away"]');
    expect(home && away).toBeTruthy();
    if (home && away) {
      expect(home.compareDocumentPosition(away) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId("sce-match-list-row-time")).toBeTruthy();
    expect(screen.queryByTestId("sce-match-schedule-time")).toBeNull();
    expect(screen.getByTestId("sce-match-vs")).toBeTruthy();
    const crest = container.querySelector('[data-sce-match-region="home-crest"]');
    expect(crest?.querySelector(".h-11")).toBeTruthy();
  });
});
