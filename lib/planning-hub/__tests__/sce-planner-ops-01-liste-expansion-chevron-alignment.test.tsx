/**
 * @vitest-environment jsdom
 * SCE-PLANNER-OPS-01 — expansion chevron shares one full-width trailing row across activity kinds.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "@/components/admin/planning-hub/PlanningHubListeView";
import {
  PLANNING_HUB_LISTE_MENU_ANCHOR_CLASS,
  PLANNING_HUB_LISTE_MEASURED_ROW_CLASS,
} from "@/lib/planning-hub/planning-hub-liste-expansion-layout";
import type {
  WeekplannerMatchItem,
  WeekplannerTournamentItem,
  WeekplannerTrainingItem,
  WeekplannerVeranstaltungItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Im Brüel",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

function training(id: string): WeekplannerTrainingItem {
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["Junioren F2"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

function match(id: string): WeekplannerMatchItem {
  return {
    id,
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-10-05T18:15:00.000Z"),
    endAt: new Date("2026-10-05T20:15:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T18:15:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T20:15:00.000Z"),
    timeOverridden: false,
    title: "Junioren C2",
    teamNames: ["Junioren C2"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-match",
    opponentName: "FC Therwil C2",
    eventSource: "MANUAL",
    homeSide: { displayName: "FC Allschwil", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Therwil C2", logoUrl: null, isOwnTeam: false },
    homeAway: "HOME",
    teamSeasonId: "ts1",
  };
}

function tournament(id: string): WeekplannerTournamentItem {
  return {
    id,
    tenantId: "t1",
    type: "TOURNAMENT",
    startAt: new Date("2026-10-05T09:00:00.000Z"),
    endAt: new Date("2026-10-05T17:00:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T09:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T17:00:00.000Z"),
    timeOverridden: false,
    title: "PlayMore Turnier",
    teamNames: ["Junioren F3"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-tournament",
    homeAway: "HOME",
    teamSeasonIds: ["ts1"],
    participantAllocations: [],
    organizerName: "FC Allschwil",
    organizerLogoUrl: null,
    organizerExternalClubId: null,
  };
}

function veranstaltung(id: string): WeekplannerVeranstaltungItem {
  return {
    id,
    tenantId: "t1",
    type: "VERANSTALTUNG",
    startAt: new Date("2026-10-05T18:30:00.000Z"),
    endAt: new Date("2026-10-05T20:00:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T18:30:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T20:00:00.000Z"),
    timeOverridden: false,
    title: "Generalversammlung",
    teamNames: [],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-club",
    allDay: false,
    visibility: { websiteVisible: false, infoboardVisible: false, homepageVisible: false, wochenplanVisible: true },
    audienceScope: "CLUB",
    audienceLabel: "Gesamter Verein",
  };
}

function week(
  items: Array<WeekplannerTrainingItem | WeekplannerMatchItem | WeekplannerTournamentItem | WeekplannerVeranstaltungItem>,
): WeekplannerWeek {
  return {
    param: "2026-10-05",
    previousParam: "2026-09-28",
    nextParam: "2026-10-12",
    weekNumberLabel: "KW 40",
    rangeLabel: "5.–11. Okt. 2026",
    days: [{ dayKey: "2026-10-05", items: annotateWeekplannerConflicts(items) }],
  };
}

const permissionContext = {
  canManageTrainings: true,
  canManageEvents: true,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

describe("SCE-PLANNER-OPS-01 Liste expansion chevron alignment", () => {
  it("wires shared measured-row + overlay menu contract in PlanningHubListeActivityRow", () => {
    const row = read("components/admin/planning-hub/PlanningHubListeActivityRow.tsx");
    expect(row).toContain("planning-hub-liste-expansion-layout");
    expect(row).toContain("PLANNING_HUB_LISTE_MENU_ANCHOR_CLASS");
    expect(row).toContain("PLANNING_HUB_LISTE_MEASURED_ROW_CLASS");
    expect(row).not.toContain('data-sce-planning-hub-liste-column="ACTIONS"');
    expect(row).not.toContain("pt-2 pr-0.5");
  });

  it("keeps expansion toggles on the same summary-controls row for every activity kind", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1"), match("match:1"), tournament("tournament:1"), veranstaltung("veranstaltung:1")])}
        urlState={{
          perspective: "liste",
          activity: "alle",
          team: null,
          facility: null,
          search: "",
          conflictsOnly: false,
          resourceCategory: "pitch",
          resourceFilterIds: null,
        }}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onToggleExpand={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    for (const item of [
      { id: "training:1", testId: "planning-hub-liste-collapsible-training:1-summary-controls" },
      { id: "match:1", testId: "planning-hub-liste-collapsible-match:1-summary-controls" },
      { id: "tournament:1", testId: "planning-hub-liste-collapsible-tournament:1-summary-controls" },
      { id: "veranstaltung:1", testId: "planning-hub-liste-collapsible-veranstaltung:1-summary-controls" },
    ]) {
      const row = screen.getByTestId(`planning-hub-liste-row-${item.id}`);
      expect(row.querySelector('[data-sce-planning-hub-liste-column="ACTIONS"]')).toBeNull();

      const measured = row.querySelector("[data-sce-planning-hub-liste-measured-row]");
      expect(measured?.className).toContain("w-full");
      expect(measured?.className).toContain("flex-1");

      const menuAnchor = within(row).getByTestId(`planning-hub-liste-row-menu-${item.id}`).closest(
        "[data-sce-planning-hub-liste-menu-anchor]",
      );
      expect(menuAnchor?.className).toContain("absolute");

      const controls = screen.getByTestId(item.testId);
      const toggle = within(controls).getByRole("button", { expanded: false, name: /(ausklappen|einklappen)/i });
      expect(toggle.className).toMatch(/h-8/);
      expect(toggle.className).toMatch(/w-8/);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("exports one canonical menu anchor + measured row class pair", () => {
    expect(PLANNING_HUB_LISTE_MENU_ANCHOR_CLASS).toMatch(/absolute/);
    expect(PLANNING_HUB_LISTE_MEASURED_ROW_CLASS).toMatch(/w-full/);
    expect(PLANNING_HUB_LISTE_MEASURED_ROW_CLASS).toMatch(/flex-1/);
  });
});
