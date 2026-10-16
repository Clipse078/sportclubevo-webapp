/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01J-R5.5.1 — Wochenplaner Liste canonical full-width list composition.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import type {
  WeekplannerMatchItem,
  WeekplannerTrainingItem,
  WeekplannerTournamentItem,
  WeekplannerVeranstaltungItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

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

function training(id: string, team: string): WeekplannerTrainingItem {
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
    teamNames: [team],
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
    opponentName: "FC Basel",
    eventSource: "MANUAL",
    homeSide: {
      displayName: "FC Allschwil",
      logoUrl: "/crests/fca.png",
      isOwnTeam: true,
    },
    awaySide: {
      displayName: "FC Basel",
      logoUrl: "/crests/basel.png",
      isOwnTeam: false,
    },
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
    title: "Frühlingscup",
    teamNames: ["Junioren B1"],
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
    organizerLogoUrl: "/crests/fca.png",
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
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
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
    location: "Clubhaus",
    teamSeasonId: null,
    allDay: false,
  };
}

function week(items: WeekplannerWeek["days"][0]["items"]): WeekplannerWeek {
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

const baseUrlState = {
  perspective: "liste" as const,
  activity: "alle" as const,
  team: null,
  facility: null,
  search: "",
  conflictsOnly: false,
  resourceCategory: "pitch" as const,
  resourceFilterIds: null,
};

describe("PlanningHubListeView — R5.5.1 canonical list composition", () => {
  it("uses the programme shell as the sole list-row visual shell (full width, no nested planner row)", () => {
    const { container } = render(
      <PlanningHubListeView
        week={week([
          training("training:1", "Junioren F2"),
          match("match:1"),
          tournament("tournament:1"),
          veranstaltung("veranstaltung:1"),
        ])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const rows = container.querySelectorAll("[data-sce-planning-hub-liste-row]");
    expect(rows.length).toBe(4);

    for (const row of rows) {
      expect(row).toHaveAttribute("data-sce-programme-activity-card-shell");
      expect(row).toHaveAttribute("data-sce-planning-hub-liste-full-width-contract", "canonical-shell");
      expect(row.className).toMatch(/\bw-full\b/);
      expect(row.getAttribute("data-sce-programme-activity-card-shell")).not.toBeNull();
      expect(row.parentElement?.querySelectorAll("[data-sce-programme-activity-card-shell]").length).toBe(1);
      expect(row.querySelector('[class*="shadow-sm"][class*="rounded-lg border"]')).toBeNull();
    }
  });

  it("anchors the action menu inside the canonical shell, not a detached outer row", () => {
    render(
      <PlanningHubListeView
        week={week([match("match:1")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const row = screen.getByTestId("planning-hub-liste-row-match:1");
    const menuAnchor = within(row).getByTestId("planning-hub-liste-row-menu-match:1");
    expect(menuAnchor.closest("[data-sce-programme-activity-card-shell]")).toBe(row);
    expect(menuAnchor.closest("[data-sce-planning-hub-liste-menu-anchor]")).toBeTruthy();
  });

  it("preserves match fixture composition inside the full-width shell", () => {
    render(
      <PlanningHubListeView
        week={week([match("match:1")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(fixture.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(screen.getByTestId("sce-match-vs")).toBeInTheDocument();
    expect(fixture.closest("[data-sce-planning-hub-liste-row]")).toBeTruthy();
  });

  it("retains operational issue summary and hover/focus detail wiring on the card button", async () => {
    const user = userEvent.setup();
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    expect(screen.getByTestId("planning-hub-liste-operational-summary")).toHaveTextContent(/Unvollständig/);
    const openSurface = screen.getByTestId("weekplanner-item-training");
    await user.tab();
    expect(openSurface).toHaveFocus();
    expect(await screen.findByTestId("planning-hub-activity-detail")).toBeInTheDocument();
  });

  it("does not apply a fixed narrow width contract on list-row Sce cards", () => {
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        onItemOpen={vi.fn()}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );

    const card = screen.getByTestId("planning-hub-liste-sce-training-training:1");
    expect(card.className).toMatch(/max-w-none|max-w-full/);
  });
});
