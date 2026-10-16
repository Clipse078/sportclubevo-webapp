import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildProgrammeFeedGroups,
  DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
  limitProgrammeFeedGroupsToPreview,
} from "../programme-feed-groups";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import { MEIN_PROGRAMM_LISTE_FORWARD_DAYS } from "../programme-range";

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

describe("SCE-ACTIVITY-CREATE-01J R3 — Dashboard Mein Programm preview", () => {
  it("uses PERSON programme boundary via loadPersonalProgramme in command center", () => {
    const pcc = readRelative("lib/dashboard/personal-command-center.ts");
    expect(pcc).toContain("loadPersonalProgramme");
    expect(pcc).not.toContain("queryProgramme(");
  });

  it("applies cockpit preview limit at workspace presentation only", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
    expect(workspace).toContain("limitProgrammeFeedGroupsToPreview");
    expect(DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT).toBe(5);
  });

  it("keeps chronological day grouping for Heute / Morgen / date labels", () => {
    const now = new Date("2026-10-16T08:00:00.000Z");
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
        item({
          id: "later",
          sourceType: "TOURNAMENT",
          startsAt: new Date("2026-10-20T10:00:00.000Z"),
        }),
      ],
      timeZone: "Europe/Zurich",
      locale: "de-CH",
      now,
    });
    expect(groups.map((g) => g.labelKind)).toEqual(["today", "tomorrow", "date"]);
    const preview = limitProgrammeFeedGroupsToPreview(
      groups,
      DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT,
    );
    expect(preview.flatMap((g) => g.items.map((i) => i.id))).toEqual([
      "today",
      "tomorrow",
      "later",
    ]);
  });

  it("routes dashboard preview through canonical Sce* cards, not Dashboard-specific cards", () => {
    const previewRow = readRelative("components/ui/dashboard/PersonalProgrammePreviewRow.tsx");
    const feed = readRelative("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    expect(feed).toContain("PersonalProgrammePreviewRow");
    expect(previewRow).toContain("PersonalProgrammeCanonicalAgendaRow");
    expect(previewRow).toContain('density="COMPACT"');
    expect(previewRow).not.toMatch(/Dashboard(Match|Training|Tournament|ClubEvent|Activity)Card/);
    const canonical = readRelative("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
    expect(canonical).toContain("SceTrainingCard");
    expect(canonical).toContain("SceMatchCard");
    expect(canonical).toContain("SceTournamentCard");
    expect(canonical).toContain("SceClubEventCard");
  });

  it("retains legacy agenda path only for meetings and missing canonical presentation", () => {
    const previewRow = readRelative("components/ui/dashboard/PersonalProgrammePreviewRow.tsx");
    expect(previewRow).toContain('item.sourceType === "MEETING"');
    expect(previewRow).toContain("!item.canonicalPresentation");
    expect(previewRow).toContain("PersonalProgrammeAgendaRow");
  });

  it("links full programme CTA to canonical Mein Programm route", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("MEIN_PROGRAMM_BASE_PATH");
    expect(workspace).toContain("personal-programme-view-all");
  });

  it("removes duplicate selected-day sporting agenda under cockpit calendar", () => {
    const workspace = readRelative("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("showSelectedDayPanel={false}");
    expect(workspace).not.toContain("showSelectedDayPanel\n");
  });

  it("does not wire legacy today/agenda widgets on dashboard shell", () => {
    const club = readRelative("components/admin/dashboard/ClubDashboardView.tsx");
    expect(club).not.toContain("DashboardTodayEventCards");
    expect(club).not.toContain("MeineAgendaWidget");
  });

  it("emphasizes nearest upcoming preview item without a separate hero component", () => {
    const feed = readRelative("components/ui/dashboard/PersonalProgrammeFeed.tsx");
    expect(feed).toContain("nextActivityId");
    expect(feed).not.toMatch(/DashboardHeroActivity|HeroActivityCard/);
  });

  it("dedupes programme items by id for multi-team relevance", () => {
    const loader = readRelative("lib/personal-agenda/load-personal-programme.ts");
    expect(loader).toContain("dedupeProgrammeItems");
  });

  it("documents Mein Programm list range without changing it in R3", () => {
    expect(MEIN_PROGRAMM_LISTE_FORWARD_DAYS).toBe(90);
  });
});

describe("SCE-ACTIVITY-CREATE-01J R3 — R2 / Navbar regression sentinels", () => {
  it("preserves Mein Programm workspace route and view switcher", () => {
    const page = readRelative("app/(admin)/dashboard/mein-programm/page.tsx");
    expect(page).toContain("ProgrammeViewSwitcher");
    expect(page).toContain("PersonalProgrammeListeView");
  });

  it("preserves navbar shell markers on dashboard page", () => {
    const club = readRelative("components/admin/dashboard/ClubDashboardView.tsx");
    expect(club).toContain("sce-page-shell--dashboard");
    expect(club).not.toContain("DashboardL1");
  });
});
