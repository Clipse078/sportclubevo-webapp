import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";
import { weekplannerMatchPublicationVisibilityFixture } from "@/lib/weekplanner/match-item-fixtures";
import { weekplannerMatchToMatchcenterSummary } from "@/lib/planning-hub/weekplanner-match-matchcenter-bridge";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function minimalMatchItem(
  publicationVisibility = weekplannerMatchPublicationVisibilityFixture({
    infoboardVisible: true,
  }),
): WeekplannerMatchItem {
  const start = new Date("2026-08-10T16:30:00.000Z");
  const end = new Date("2026-08-10T18:00:00.000Z");
  return {
    id: "match:e1",
    tenantId: "tenant-a",
    type: "MATCH",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Home — Away",
    teamNames: ["Home"],
    opponentName: "Away",
    eventSource: "MANUAL",
    homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
    homeAway: "HOME",
    eventId: "e1",
    teamSeasonId: "ts-1",
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    awayDressingRoomAllocations: [],
    publicationVisibility,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

describe("SCE-PLANNER-OPS-01 #978 technical delivery", () => {
  it("weekplanner match bridge preserves persisted infoboardVisible (true and false)", () => {
    const on = weekplannerMatchToMatchcenterSummary(
      minimalMatchItem(weekplannerMatchPublicationVisibilityFixture({ infoboardVisible: true })),
    );
    const off = weekplannerMatchToMatchcenterSummary(
      minimalMatchItem(weekplannerMatchPublicationVisibilityFixture({ infoboardVisible: false })),
    );
    expect(on.visibility.infoboardVisible).toBe(true);
    expect(off.visibility.infoboardVisible).toBe(false);
  });

  it("weekplanner queries map match publicationVisibility from matchcenter visibility", () => {
    const queries = read("lib/weekplanner/queries.ts");
    expect(queries).toContain("publicationVisibility: match.visibility");
  });

  it("Liste Veranstaltung Termin save uses parseClubEventScheduleFromApiBody like the sheet editor", () => {
    const panel = read("components/admin/planning-hub/PlanningHubListeOperationalPanel.tsx");
    expect(panel).toContain("parseClubEventScheduleFromApiBody");
    expect(panel).toContain("canDomainManagePlannerItem(item, plannerEditAccess)");
  });

  it("club-event PATCH revalidates planner week paths after schedule mutations", () => {
    const route = read("app/api/events/[eventId]/route.ts");
    expect(route).toContain("revalidatePlannerWeekPaths");
    expect(route).toMatch(/if \(scheduleTouched\)[\s\S]*revalidatePlannerWeekPaths/);
  });
  it("match preparation panel rolls back draft on failed PATCH", () => {
    const panel = read("components/admin/matchcenter/SpieleManagementMatchPreparationPanel.tsx");
    expect(panel).toContain('if (!ok) {');
    expect(panel).toMatch(/setDraft\(\(prev\) => \(\{ \.\.\.prev, \[field\]: previousValue \}\)\)/);
  });
});
