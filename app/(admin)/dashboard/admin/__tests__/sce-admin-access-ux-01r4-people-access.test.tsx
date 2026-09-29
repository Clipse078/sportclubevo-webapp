/**
 * @vitest-environment jsdom
 * SCE-ADMIN-ACCESS-UX-01R4
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NavAlignedPermissionEditor from "@/components/admin/roles/NavAlignedPermissionEditor";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  applyPermissionOverrides,
  reconcileOverridesFromEffectiveChange,
} from "@/lib/permissions/apply-permission-overrides";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const ROLE_EDITOR_CATALOG = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.ORG_MANAGE,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_MANAGE,
  PERMISSIONS.TRAININGS_VIEW,
  PERMISSIONS.TRAININGS_MANAGE,
  PERMISSIONS.EVENTS_VIEW,
  PERMISSIONS.EVENTS_MANAGE,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ROLES_MANAGE,
];

function buildModuleGroups(keys: string[]) {
  return [
    {
      module: "TEST",
      permissions: keys.map((key, index) => ({
        id: String(index + 1),
        key,
        name: key,
        module: "TEST",
      })),
    },
  ];
}

describe("SCE-ADMIN-ACCESS-UX-01R4 — crash regression", () => {
  it("does not throw when expanding Tagesbetrieb and Alles einblenden", () => {
    const moduleGroups = buildModuleGroups(ROLE_EDITOR_CATALOG);
    expect(() =>
      render(
        <NavAlignedPermissionEditor
          moduleGroups={moduleGroups}
          selectedKeys={new Set([PERMISSIONS.TRAININGS_VIEW])}
          onChange={vi.fn()}
          peopleAccessMode
        />,
      ),
    ).not.toThrow();

    fireEvent.click(screen.getByRole("button", { name: /Alles einblenden/i }));
    const tagesbetrieb = screen.getByRole("button", { name: /Tagesbetrieb/i });
    expect(tagesbetrieb).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Trainings")).toBeTruthy();
    fireEvent.click(tagesbetrieb);
    expect(tagesbetrieb).toHaveAttribute("aria-expanded", "false");
  });
});

describe("SCE-ADMIN-ACCESS-UX-01R4 — filter toolbar", () => {
  it("uses sce-toolbar-select without bg-white on status/funktion controls", () => {
    const { container } = render(
      <TenantUsersSearchableList
        initialUsers={[]}
        personsWithoutUser={[]}
        currentUserId="u1"
        canInvite={false}
      />,
    );
    const selects = container.querySelectorAll("select.sce-toolbar-select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
    for (const select of selects) {
      expect(select.className).not.toMatch(/bg-white/);
      expect(select.className).toMatch(/fca-select/);
    }
    expect(screen.queryByRole("button", { name: /Person hinzufügen/i })).toBeNull();
  });
});

describe("SCE-ADMIN-ACCESS-UX-01R4 — overrides UX", () => {
  const moduleGroups = buildModuleGroups([
    PERMISSIONS.TEAMS_VIEW,
    PERMISSIONS.TEAMS_MANAGE,
  ]);

  it("uses switches only (no permission checkboxes)", () => {
    render(
      <PeopleAccessPermissionPanel
        moduleGroups={moduleGroups}
        permissionKeys={[PERMISSIONS.TEAMS_VIEW]}
        roleNamesByKey={{ [PERMISSIONS.TEAMS_VIEW]: ["Trainer/in"] }}
        interactive
        overrideDraft={{}}
        onOverrideDraftChange={vi.fn()}
      />,
    );
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Alles einblenden/i }));
    expect(document.querySelectorAll('[role="switch"]').length).toBeGreaterThan(0);
  });

  it("reconciles ALLOW/DENY and clears redundant overrides", () => {
    const baseline = new Set([PERMISSIONS.TEAMS_VIEW]);
    const next = new Set(baseline);
    next.delete(PERMISSIONS.TEAMS_VIEW);
    const overrides = reconcileOverridesFromEffectiveChange(baseline, next);
    expect(overrides[PERMISSIONS.TEAMS_VIEW]).toBe("DENY");

    const effective = applyPermissionOverrides(baseline, [
      { permissionKey: PERMISSIONS.TEAMS_MANAGE, effect: "ALLOW" },
    ]);
    expect(effective.has(PERMISSIONS.TEAMS_MANAGE)).toBe(true);
  });
});
