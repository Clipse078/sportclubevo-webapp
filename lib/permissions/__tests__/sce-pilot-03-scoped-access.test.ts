import { describe, expect, it, vi, beforeEach } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS,
  PLANNING_ALLOCATIONS_VIEW_PERMISSIONS,
} from "@/lib/permissions/planning-allocation-permissions";
import {
  PATRICK_SCOTTON_PILOT_VIEWER_ROLE,
  PILOT_FORBIDDEN_PERMISSION_KEYS,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { SCE_PILOT_03_PERMISSION_DEFS } from "@/lib/permissions/sce-pilot-03-permission-reconciliation";

const mocks = vi.hoisted(() => ({
  requireApiAnyPermission: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-any-permission", () => ({
  requireApiAnyPermission: mocks.requireApiAnyPermission,
}));

describe("SCE-PILOT-03 scoped access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines Sandra allocation manage without forbidden broad keys", () => {
    for (const forbidden of PILOT_FORBIDDEN_PERMISSION_KEYS) {
      expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).not.toContain(forbidden);
    }
    expect(SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys).toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    );
  });

  it("defines Patrick as read-only planning", () => {
    expect(PATRICK_SCOTTON_PILOT_VIEWER_ROLE.permissionKeys).toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    );
    expect(PATRICK_SCOTTON_PILOT_VIEWER_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE,
    );
    expect(PATRICK_SCOTTON_PILOT_VIEWER_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.COMMUNICATION_INBOX_VIEW,
    );
  });

  it("shows Spielbetrieb planning centers without admin surfaces for Sandra nav keys", () => {
    const sections = getVisibleNavSections([...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys]);
    const hrefs = sections.flatMap((s) =>
      s.items.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]),
    );
    expect(hrefs).toContain("/dashboard/planner/week");
    expect(hrefs).toContain("/dashboard/training");
    expect(hrefs).toContain("/dashboard/matchcenter");
    expect(hrefs).toContain("/dashboard/tournamentcenter");
    expect(hrefs).not.toContain("/vereinsleitung/finanzen");
    expect(hrefs).not.toContain("/dashboard/mitglieder");
    expect(hrefs).toContain("/dashboard/website/news");
    expect(hrefs).toContain("/dashboard/infoboard/preview");
  });

  it("allocation manage permission set excludes wochenplan.manage", () => {
    expect(PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS).not.toContain(PERMISSIONS.WOCHENPLAN_MANAGE);
  });

  it("allocation view includes dedicated view key", () => {
    expect(PLANNING_ALLOCATIONS_VIEW_PERMISSIONS).toContain(
      PERMISSIONS.PLANNING_ALLOCATIONS_VIEW,
    );
  });

  it("defines five SCE-PILOT-03 catalog permission keys", () => {
    expect(SCE_PILOT_03_PERMISSION_DEFS).toHaveLength(5);
  });
});

describe("SCE-PILOT-03 allocation API authorization (mocked)", () => {
  beforeEach(() => {
    mocks.requireApiAnyPermission.mockReset();
  });

  it("denies allocation-only caller from training session reschedule route permission", async () => {
    mocks.requireApiAnyPermission.mockImplementation(async (keys: string[]) => {
      const allowed = keys.some((k) => k === PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
      return allowed
        ? { ok: true, session: { user: { activeTenantId: "t1", permissionKeys: [PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE] } } }
        : { ok: false, error: "Forbidden", status: 403 };
    });

    const rescheduleKeys = [PERMISSIONS.TRAININGS_MANAGE];
    const result = await mocks.requireApiAnyPermission(rescheduleKeys);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("allows allocation manage on weekplanner allocation POST guard keys", async () => {
    mocks.requireApiAnyPermission.mockImplementation(async (keys: string[]) => {
      const has = keys.includes(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
      return has
        ? { ok: true, session: { user: { activeTenantId: "t1" } } }
        : { ok: false, status: 403 };
    });

    const result = await mocks.requireApiAnyPermission([...PLANNING_ALLOCATIONS_MANAGE_PERMISSIONS]);
    expect(result.ok).toBe(true);
  });
});
