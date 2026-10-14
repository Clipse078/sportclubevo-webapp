import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_ACTIVITY_CREATE_MENU_ENTRIES,
  SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS,
} from "../activity-create-menu-config";
import {
  resolveSceActivityCreatePermissionsFromFlags,
  sceActivityCreatePermissionsHasAny,
} from "../activity-create-permissions";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const ELIGIBLE_SURFACE_FILES = [
  "components/admin/planner/WeekPlannerChrome.tsx",
  "app/(admin)/dashboard/training/page.tsx",
  "app/(admin)/dashboard/matchcenter/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/page.tsx",
  "app/(admin)/dashboard/planner/week/page.tsx",
] as const;

describe("SCE-ACTIVITY-CREATE-01G — global create integration", () => {
  it("defines canonical menu entries with semantic labels", () => {
    expect(SCE_ACTIVITY_CREATE_MENU_ENTRIES.map((e) => e.label)).toEqual([
      "Training",
      "Spiel",
      "Turnier",
      "Veranstaltung",
    ]);
    expect(SCE_ACTIVITY_CREATE_MENU_ENTRIES.map((e) => e.accentToken)).toEqual([
      "training-blue",
      "match-red",
      "tournament-orange",
      "club-event-violet",
    ]);
  });

  it("centralizes permission resolution independent of surface", () => {
    expect(
      resolveSceActivityCreatePermissionsFromFlags({
        canManageTrainings: true,
        canManageEvents: false,
      }),
    ).toEqual({
      training: true,
      match: false,
      tournament: false,
      veranstaltung: false,
    });
    expect(
      resolveSceActivityCreatePermissionsFromFlags({
        canManageTrainings: false,
        canManageEvents: true,
      }),
    ).toEqual({
      training: false,
      match: true,
      tournament: true,
      veranstaltung: true,
    });
    expect(sceActivityCreatePermissionsHasAny({ training: false, match: false, tournament: false, veranstaltung: false })).toBe(
      false,
    );
  });

  it("ships canonical SceActivityCreateMenu with overlay composers and fallbacks", () => {
    const menu = read("components/sce/activity-create/SceActivityCreateMenu.tsx");
    expect(menu).toContain("sce-activity-create");
    expect(menu).toContain("TrainingCreateForm");
    expect(menu).toContain("MatchCreateForm");
    expect(menu).toContain("TournamentCreateForm");
    expect(menu).toContain("VeranstaltungCreateForm");
    expect(menu).toContain('containerMode="overlay"');
    expect(menu).toContain("originContext");
    expect(menu).toContain("PLANNING_SURFACE");
    expect(menu).toContain("Escape");
    expect(menu).toContain("SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS");
    expect(Object.values(SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS).every((l) => l.endsWith("(Seite)"))).toBe(
      true,
    );
  });

  it("PlanningHubCreateMenu re-exports canonical implementation", () => {
    const hub = read("components/admin/planning-hub/PlanningHubCreateMenu.tsx");
    expect(hub).toContain("SceActivityCreateMenu");
    expect(hub).not.toContain("TrainingCreateForm");
  });

  it.each(ELIGIBLE_SURFACE_FILES)("%s adopts SceActivityCreateMenu", (file) => {
    const source = read(file);
    expect(source).toMatch(/SceActivityCreateMenu|PlanningHubCreateMenu/);
    expect(source).not.toMatch(/TrainingComposerCreateTrigger|MatchComposerCreateTrigger/);
    expect(source).not.toMatch(/TournamentComposerCreateTrigger|VeranstaltungenComposerCreateTrigger/);
  });

  it("guardrail — eligible surfaces must not expose dedicated activity-create CTAs", () => {
    for (const file of [
      "components/admin/matchcenter/SpieleManagementHeaderMenu.tsx",
      "components/admin/tournamentcenter/TurniereManagementHeaderMenu.tsx",
      "components/admin/training/TrainingManagementQuickAccess.tsx",
    ]) {
      const source = read(file);
      expect(source).not.toMatch(/Training erstellen|Spiel erstellen|Turnier erstellen|Veranstaltung erstellen/);
    }
  });

  it("documents global trigger architecture", () => {
    expect(existsSync(join(root, "docs/roadmap/SCE-ACTIVITY-CREATE-01G.md"))).toBe(true);
    expect(read("docs/roadmap/SCE-ACTIVITY-CREATE-01G.md")).toContain("GLOBAL_ACTIVITY_CREATE_TRIGGER");
  });
});
