/**
 * @vitest-environment jsdom
 * SCE-ACTIVITY-CREATE-01H-R4 — Wochenplaner Liste canonical World Activity Cards.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanningHubListeView from "../PlanningHubListeView";
import type {
  WeekplannerMatchItem,
  WeekplannerTournamentItem,
  WeekplannerTrainingItem,
  WeekplannerVeranstaltungItem,
  WeekplannerWeek,
} from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

const renderListe = (items: WeekplannerWeek["days"][0]["items"]) =>
  render(
    <PlanningHubListeView
      week={week(items)}
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

describe("PlanningHubListeView — SCE-ACTIVITY-CREATE-01H-R4 canonical cards", () => {
  it("renders SceTrainingCard list-row for training", () => {
    renderListe([training("training:1", "Junioren F2")]);
    expect(screen.getByTestId("planning-hub-liste-sce-training-training:1")).toHaveAttribute(
      "data-surface",
      "list-row",
    );
    expect(screen.getByText("TRAINING")).toBeInTheDocument();
    expect(screen.getByTestId("planning-hub-liste-row-resources").textContent).toContain("Kunstrasen 2");
  });

  it("renders match fixture with HOME left, AWAY right, VS, and list-row crests", () => {
    renderListe([match("match:1")]);
    const card = screen.getByTestId("planning-hub-liste-sce-match-match:1");
    expect(card).toHaveAttribute("data-surface", "list-row");
    expect(screen.getByTestId("sce-match-vs")).toBeInTheDocument();
    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture.textContent).toMatch(/FC Allschwil[\s\S]*FC Basel/);
    expect(fixture.querySelector('[data-sce-match-side="home"]')).toBeTruthy();
    expect(fixture.querySelector('[data-sce-match-side="away"]')).toBeTruthy();
    expect(screen.getByTestId("planning-hub-liste-row-menu-match:1")).toBeInTheDocument();
  });

  it("renders tournament organiser without VS semantics", () => {
    renderListe([tournament("tournament:1")]);
    expect(screen.getByTestId("planning-hub-liste-sce-tournament-tournament:1")).toHaveAttribute(
      "data-surface",
      "list-row",
    );
    expect(screen.getByText(/Frühlingscup/i)).toBeInTheDocument();
    expect(screen.queryByTestId("sce-match-vs")).not.toBeInTheDocument();
    expect(screen.getByTestId("sce-tournament-organiser-crest")).toBeInTheDocument();
    expect(screen.getByTestId("sce-tournament-hauptteam")).toHaveTextContent("Junioren B1");
  });

  it("R4.3 — omits visible HEIM/AUSWÄRTS marker from list-row match fixture", () => {
    renderListe([match("match:1")]);
    const fixture = screen.getByTestId("sce-match-fixture");
    expect(fixture.querySelector('[data-sce-match-region="tenant-side-marker"]')).toBeNull();
    expect(screen.queryByTestId("sce-match-context-heim")).not.toBeInTheDocument();
  });

  it("exposes shared desktop grid contract on every activity row", () => {
    const { container } = renderListe([
      training("training:1", "Junioren F2"),
      match("match:1"),
      tournament("tournament:1"),
      veranstaltung("veranstaltung:1"),
    ]);
    const rows = container.querySelectorAll("[data-sce-planning-hub-liste-row]");
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(row).toHaveAttribute("data-sce-planning-hub-liste-grid");
      expect(row.querySelector('[data-testid="planning-hub-liste-row-time"]')).toBeTruthy();
      expect(row.querySelector('[data-testid="planning-hub-liste-row-resources"]')).toBeTruthy();
      expect(row.querySelector('[data-testid="planning-hub-liste-row-status"]')).toBeTruthy();
    }
  });

  it("renders club event with VERANSTALTUNG identity", () => {
    renderListe([veranstaltung("veranstaltung:1")]);
    expect(screen.getByTestId("planning-hub-liste-sce-club-event-veranstaltung:1")).toHaveAttribute(
      "data-surface",
      "list-row",
    );
    expect(screen.getByText("VERANSTALTUNG")).toBeInTheDocument();
    expect(screen.getByText("Generalversammlung")).toBeInTheDocument();
  });

  it("keeps operational status visible and row menu actions", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <PlanningHubListeView
        week={week([training("training:1", "Junioren F2")])}
        urlState={baseUrlState}
        locale="de-CH"
        timezone="Europe/Zurich"
        tenantClubName="FC Allschwil"
        onItemOpen={onOpen}
        onItemEditPlanning={vi.fn()}
        onReviewConflictForItem={vi.fn()}
        canEditItem={() => true}
        permissionContext={permissionContext}
      />,
    );
    expect(screen.getByTestId("planning-hub-liste-row-status").textContent).toBe("Unvollständig");
    await user.click(screen.getByTestId("weekplanner-item-training"));
    expect(onOpen).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("planning-hub-liste-row-menu-training:1"));
    expect(screen.getByTestId("planning-hub-liste-action-open-training:1")).toBeInTheDocument();
  });

  it("uses transparent crest pipeline — no circular avatar wrapper on resolvable logos", () => {
    const crestSource = readFileSync(
      join(process.cwd(), "components/sporting-activity/ClubCrest.tsx"),
      "utf8",
    );
    expect(crestSource).toContain("object-contain");
    renderListe([match("match:1")]);
    const homeCrest = document.querySelector('[data-sce-match-region="home-crest"] img');
    expect(homeCrest).toBeTruthy();
    expect(homeCrest?.className).toContain("object-contain");
  });
});
