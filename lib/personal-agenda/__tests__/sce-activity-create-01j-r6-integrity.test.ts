/**
 * SCE-ACTIVITY-CREATE-01J-R6 — responsive / a11y / programme-engine / legacy-test integrity (structural).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01J-R6 integrity", () => {
  describe("Dashboard responsive cockpit", () => {
    it("uses single-column mobile and two-column md+ without fixed overflow widths", () => {
      const grid = read("components/ui/dashboard/DashboardCockpitGrid.tsx");
      expect(grid).toContain("grid-cols-1");
      expect(grid).toContain("md:grid-cols-2");
      expect(grid).toContain("minmax(0,1fr)");
      expect(grid).toContain("min-w-0");

      const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
      expect(workspace).toContain('data-testid="personal-dashboard-workspace"');
      expect(workspace).toContain("min-w-0");
      expect(workspace).toContain("order-1");
      expect(workspace).toContain("order-2");
      expect(workspace).not.toMatch(/w-\[\d{3,}px\]/);
    });

    it("freezes cockpit calendar without selected-day sporting agenda duplicate", () => {
      const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
      expect(workspace).toContain("showSelectedDayPanel={false}");
    });
  });

  describe("Mein Programm responsive filters", () => {
    it("wraps filter controls and exposes keyboard focus + aria-pressed toggles", () => {
      const filters = read("components/admin/mein-programm/PersonalProgrammeFilterBar.tsx");
      expect(filters).toContain("flex-wrap");
      expect(filters).toContain("aria-pressed");
      expect(filters).toContain("focus-visible:outline");
      expect(filters).not.toMatch(/overflow-x-auto/);
    });

    it("list rows stay min-w-0 inside chronological sections", () => {
      const liste = read("components/admin/mein-programm/PersonalProgrammeListeView.tsx");
      expect(liste).toContain("min-w-0");
      expect(liste).toContain("aria-labelledby");
      expect(liste).toContain("data-testid=\"personal-programme-liste-empty\"");
    });
  });

  describe("Programme engine boundaries", () => {
    it("dashboard command center uses shared PERSON loader — no parallel engines", () => {
      const pcc = read("lib/dashboard/personal-command-center.ts");
      expect(pcc).toContain("loadPersonalProgramme");
      expect(pcc).not.toMatch(/DashboardProgrammeEngine|MeinProgrammEngine|PersonalActivityEngine/);

      const loader = read("lib/personal-agenda/load-personal-programme.ts");
      expect(loader).toContain("loadPersonScopeSportingProgrammeItems");
    });

    it("club programme page keeps CLUB queryProgramme scope", () => {
      const clubProgramme = read("app/(admin)/dashboard/programm/page.tsx");
      expect(clubProgramme).toContain('kind: "CLUB"');
    });
  });

  describe("Activity card family — no parallel dashboard card fork", () => {
    it("personal programme rows route through PersonalProgrammeCanonicalAgendaRow only", () => {
      const row = read("components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx");
      expect(row).toContain("SceTrainingCard");
      expect(row).toContain("SceMatchCard");
      expect(row).toContain("SceTournamentCard");
      expect(row).toContain("SceClubEventCard");
      expect(row).not.toMatch(/SceDashboard|PersonalProgrammeCard/);
    });
  });

  describe("Wochenplaner R5.5.1 freeze", () => {
    it("liste rows use canonical full-width shell contract", () => {
      const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
      expect(row).toContain('data-sce-planning-hub-liste-full-width-contract="canonical-shell"');
      expect(row).toContain("PlanningHubActivityDetailSurface");
      expect(row).not.toContain("PLANNING_HUB_LISTE_ROW_GRID_CLASS");
    });

    it("operational status is text + aria-label — not color-only", () => {
      const summary = read("components/admin/planning-hub/PlannerOperationalIssueSummary.tsx");
      expect(summary).toContain("aria-label");
      expect(summary).toContain("planning-hub-liste-operational-summary");
    });

    it("planner detail uses hover and focus without standalone info control", () => {
      const detail = read("components/admin/planning-hub/PlanningHubActivityDetailSurface.tsx");
      expect(detail).toMatch(/useHover|useFocus/);
      expect(detail).not.toMatch(/info-button|InfoButton|aria-label=\"Mehr Informationen\"/);
    });
  });

  describe("Personal calendar MICRO contract (structural)", () => {
    it("preserves buildPersonalCalendarDayPresentation pipeline", () => {
      const microTime = read("lib/calendar/sce-calendar-engine/calendar-micro-time-label.ts");
      const microPresentation = read("lib/personal-agenda/personal-calendar-micro-presentation.ts");
      expect(microTime).toContain("Ganztägig");
      expect(microTime).toContain("Fällig");
      expect(microPresentation).toContain("buildPersonalCalendarDayPresentation");
      expect(microPresentation).toContain("buildPersonalCalendarMicroEntry");
    });
  });

  describe("Responsive breakpoint matrix (structural — width-based, no zoom hacks)", () => {
    const surfaces = [
      "components/ui/dashboard/DashboardCockpitGrid.tsx",
      "components/ui/dashboard/PersonalDashboardWorkspace.tsx",
      "components/admin/mein-programm/PersonalProgrammeFilterBar.tsx",
      "components/admin/planning-hub/PlanningHubListeActivityRow.tsx",
    ];

    for (const path of surfaces) {
      it(`${path} avoids zoom-specific breakpoints`, () => {
        const source = read(path);
        expect(source).not.toMatch(/zoom:/);
      });
    }
  });

  describe("Legacy 01J debt classification", () => {
    it("keeps meeting fallback row — distinct from sporting Sce* cards", () => {
      expect(read("components/ui/dashboard/PersonalProgrammeAgendaRow.tsx")).toContain(
        "PersonalProgrammeAgendaRow",
      );
    });

    it("does not wire unused dashboard today widgets on club dashboard", () => {
      const club = read("components/admin/dashboard/ClubDashboardView.tsx");
      expect(club).not.toContain("DashboardTodayEventCards");
      expect(club).not.toContain("MeineAgendaWidget");
    });
  });

  describe("Toggle-first compliance (01J surfaces)", () => {
    it("Mein Programm filters use aria-pressed buttons — no new binary checkboxes", () => {
      const filters = read("components/admin/mein-programm/PersonalProgrammeFilterBar.tsx");
      expect(filters).not.toContain('type="checkbox"');
      expect(filters).toContain('type="button"');
    });
  });
});
