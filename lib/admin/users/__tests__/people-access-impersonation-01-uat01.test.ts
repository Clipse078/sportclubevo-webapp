import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
} from "@/lib/permissions/planning-allocation-permissions";
import {
  PATRICK_SCOTTON_PILOT_VIEWER_ROLE,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { deriveConflictResolutionCapabilities } from "@/lib/planning-hub/conflict-resolution";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const SANDRA_KEYS = [...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys];

function sandraTraining(): WeekplannerTrainingItem {
  const startAt = new Date("2026-10-07T16:45:00.000Z");
  const endAt = new Date("2026-10-07T18:15:00.000Z");
  return {
    id: "training-sandra",
    tenantId: "t1",
    type: "TRAINING",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Senioren 50+",
    teamNames: ["Senioren 50+"],
    pitchAllocations: [
      {
        facilityResourceId: "pitch-k2a",
        facilityId: "f1",
        code: "A",
        name: "Kunstrasen 2 A",
        facilityName: "Anlage",
        occupancyBeforeMinutes: 15,
        occupancyAfterMinutes: 0,
      },
    ],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [
      {
        facilityResourceId: "pitch-k2a",
        facilityResourceName: "Kunstrasen 2 A",
        resourceKind: "PITCH_HALL",
      },
    ],
    trainingSeriesId: "s1",
    trainingSessionId: "training-sandra",
    teamSeasonId: "ts1",
  };
}

describe("PEOPLE-ACCESS-IMPERSONATION-01 UAT-PERM-01 (UAT01)", () => {
  it("Sandra persona contract — Spielbetrieb operational without club admin", () => {
    expect(SANDRA_KEYS).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW);
    expect(SANDRA_KEYS).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(SANDRA_KEYS).toContain(PERMISSIONS.TRAININGS_VIEW);
    expect(SANDRA_KEYS).toContain(PERMISSIONS.EVENTS_VIEW);
    expect(SANDRA_KEYS).toContain(PERMISSIONS.TEAMS_VIEW);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.TRAININGS_MANAGE);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.FACILITIES_MANAGE);
    expect(SANDRA_KEYS).not.toContain(PERMISSIONS.USERS_IMPERSONATE_TENANT);
  });

  it("IMPERSONATION_UNAUTHORIZED_REDIRECT — safety chrome re-syncs on route changes", () => {
    const chrome = readRelative("components/admin/layout/ImpersonationSafetyChrome.tsx");
    expect(chrome).toContain("usePathname");
    expect(chrome).toContain("/api/auth/impersonation-context");
    expect(chrome).toContain("ImpersonationBanner");
  });

  it("IMPERSONATION_DASHBOARD — admin shell owns impersonation chrome above module content", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain("ImpersonationSafetyChrome");
    expect(layout.indexOf("ImpersonationSafetyChrome")).toBeLessThan(
      layout.indexOf("<main"),
    );
  });

  it("UAT01-D/E — Sandra opens Training when trainings.view is granted", () => {
    const caps = deriveConflictResolutionCapabilities(sandraTraining(), {
      canManageTrainings: false,
      canManageEvents: false,
      canManageAllocations: true,
      canViewTrainings: true,
      canViewEvents: true,
      isStandardplan: true,
      alternativePlanId: null,
    });
    expect(caps.canChangePrimaryResource).toBe(true);
    expect(caps.canOpenActivity).toBe(true);
  });

  it("UAT01-A — facility-groups API accepts allocation manage for operational reads", () => {
    expect(PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS).toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    );
    const route = readRelative("app/api/planning-hub/facility-groups/route.ts");
    expect(route).toContain("PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS");
  });

  it("READ_ONLY persona retains planner view permission only", () => {
    const keys = PATRICK_SCOTTON_PILOT_VIEWER_ROLE.permissionKeys;
    expect(keys).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW);
    expect(keys).not.toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(PLANNING_ALLOCATIONS_VIEW_PERMISSIONS).toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    );
  });
});
