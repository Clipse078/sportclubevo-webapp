import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  filterPersonalProgrammeItems,
  personalProgrammeFiltersActive,
} from "../filter-personal-programme-items";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import { buildProgrammeFeedGroups } from "../programme-feed-groups";
import { MEIN_PROGRAMM_LISTE_FORWARD_DAYS, resolveMeinProgrammListeRange } from "../programme-range";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function item(
  overrides: Partial<PersonalProgrammeItem> & Pick<PersonalProgrammeItem, "id" | "sourceType" | "startsAt">,
): PersonalProgrammeItem {
  return {
    title: "Test",
    typeLabel: "Test",
    deepLink: "/x",
    ariaLabel: "Test",
    ...overrides,
  };
}

describe("SCE-ACTIVITY-CREATE-01J R2 — Mein Programm workspace", () => {
  it("canonical route page uses shared loadPersonalProgramme only", () => {
    const page = readRelative("app/(admin)/dashboard/mein-programm/page.tsx");
    expect(page).toContain("loadPersonalProgramme");
    expect(page).not.toContain("queryProgramme(");
    expect(page).toContain("ProgrammeViewSwitcher");
    expect(page).toContain("PersonalProgrammeListeView");
    expect(page).toContain("PersonalKalenderWorkspace");
  });

  it("defaults to list-first via parseMeinProgrammUrlState", () => {
    const page = readRelative("app/(admin)/dashboard/mein-programm/page.tsx");
    expect(page).toContain('parseMeinProgrammUrlState');
    expect(page).toContain('urlState.view === "kalender"');
  });

  it("Dashboard Alle anzeigen links to canonical Mein Programm", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("MEIN_PROGRAMM_BASE_PATH");
    expect(workspace).not.toContain('quelle: "termine"');
  });

  it("legacy kalender termine-only redirects to Mein Programm calendar", () => {
    const kalenderPage = readRelative("app/(admin)/dashboard/kalender/page.tsx");
    expect(kalenderPage).toContain('urlState.quelle === "termine"');
    expect(kalenderPage).toContain("buildLegacyTermineKalenderRedirectTarget");
  });

  it("list view uses canonical Sce* agenda rows with STANDARD density", () => {
    const liste = readRelative("components/admin/mein-programm/PersonalProgrammeListeView.tsx");
    expect(liste).toContain("PersonalProgrammeCanonicalAgendaRow");
    expect(liste).toContain('density="STANDARD"');
    expect(liste).not.toMatch(/PersonalProgrammeCard|SceMeinProgrammCard/);
  });

  it("filters apply to programme items by team and activity kind", () => {
    const rows = [
      item({
        id: "t1",
        sourceType: "TRAINING",
        startsAt: new Date("2026-10-20T18:00:00Z"),
        programmeScopeTeamId: "team-a",
      }),
      item({
        id: "m1",
        sourceType: "MATCH",
        startsAt: new Date("2026-10-21T15:00:00Z"),
        programmeScopeTeamId: "team-b",
      }),
    ];
    const teamFiltered = filterPersonalProgrammeItems(rows, {
      teamIds: ["team-a"],
      activityKinds: [],
    });
    expect(teamFiltered.map((r) => r.id)).toEqual(["t1"]);

    const kindFiltered = filterPersonalProgrammeItems(rows, {
      teamIds: [],
      activityKinds: ["MATCH"],
    });
    expect(kindFiltered.map((r) => r.id)).toEqual(["m1"]);
    expect(personalProgrammeFiltersActive({ teamIds: ["a"], activityKinds: [] })).toBe(true);
  });

  it("chronological grouping uses Heute/Morgen/date labels", () => {
    const timeZone = "Europe/Zurich";
    const now = new Date("2026-10-16T10:00:00.000Z");
    const groups = buildProgrammeFeedGroups({
      items: [
        item({
          id: "today",
          sourceType: "TRAINING",
          startsAt: new Date("2026-10-16T18:00:00.000Z"),
        }),
        item({
          id: "tomorrow",
          sourceType: "MATCH",
          startsAt: new Date("2026-10-17T15:00:00.000Z"),
        }),
      ],
      timeZone,
      locale: "de-CH",
      now,
    });
    expect(groups).toHaveLength(2);
    expect(groups[0]?.labelKind).toBe("today");
    expect(groups[1]?.labelKind).toBe("tomorrow");
  });

  it("Mein Programm list range exceeds dashboard preview cap", () => {
    expect(MEIN_PROGRAMM_LISTE_FORWARD_DAYS).toBeGreaterThan(14);
    const range = resolveMeinProgrammListeRange({
      timeZone: "Europe/Zurich",
      now: new Date("2026-10-16T12:00:00.000Z"),
    });
    const spanDays =
      (range.rangeEnd.getTime() - range.rangeStart.getTime()) / (24 * 60 * 60 * 1000);
    expect(spanDays).toBeGreaterThanOrEqual(MEIN_PROGRAMM_LISTE_FORWARD_DAYS - 1);
  });

  it("reuses PersonalKalenderMonthWorkspace without forking calendar engine", () => {
    const kalender = readRelative("components/admin/kalender/PersonalKalenderWorkspace.tsx");
    expect(kalender).toContain("PersonalKalenderMonthWorkspace");
    expect(kalender).not.toMatch(/MeinProgrammCalendarEngine/);
  });

  it("view switch uses canonical ProgrammeViewSwitcher (not toggles)", () => {
    const switcher = readRelative("components/programme/ProgrammeViewSwitcher.tsx");
    expect(switcher).toContain('role="tablist"');
    expect(switcher).not.toContain("type=\"checkbox\"");
    const filters = readRelative("components/admin/mein-programm/PersonalProgrammeFilterBar.tsx");
    expect(filters).not.toContain("type=\"checkbox\"");
  });

  it("preserves R1 PERSON loader boundary", () => {
    const loader = readRelative("lib/personal-agenda/load-person-scope-sporting-programme.ts");
    expect(loader).toContain("queryProgramme");
    const programme = readRelative("lib/personal-agenda/load-personal-programme.ts");
    expect(programme).toContain("loadPersonScopeSportingProgrammeItems");
  });
});
