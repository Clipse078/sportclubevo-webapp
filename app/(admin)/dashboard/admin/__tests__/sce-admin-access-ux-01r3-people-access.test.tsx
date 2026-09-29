/**
 * @vitest-environment jsdom
 * SCE-ADMIN-ACCESS-UX-01R3 — toolbar, drawer stability, permission UX, email gate
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import PersonAccessDrawer from "@/components/admin/users/people-access/PersonAccessDrawer";
import NavAlignedPermissionEditor from "@/components/admin/roles/NavAlignedPermissionEditor";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TenantUserItem } from "@/lib/users/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseUser: TenantUserItem = {
  userId: "u1",
  firstName: "Max",
  lastName: "Muster",
  name: "Max Muster",
  email: "max@test.ch",
  userIsActive: true,
  membershipIsActive: true,
  joinedAt: "2024-01-01T00:00:00.000Z" as unknown as Date,
  lastLoginAt: "2025-01-01T00:00:00.000Z" as unknown as Date,
  roles: [{ id: "r-trainer", name: "Trainer/in", key: "trainer" }],
  scopedRoles: [{ id: "r-trainer", name: "Trainer/in", key: "trainer", orgUnitId: "ou1", orgUnitName: "F2" }],
  platformRoles: [],
  isPlatformSystemIdentity: false,
  linkedPersonId: null,
  linkedPersonName: null,
  pendingInvitation: false,
};

const minimalModuleGroups = [
  {
    module: "TEST",
    permissions: [PERMISSIONS.ORG_VIEW].map((key, index) => ({
      id: String(index + 1),
      key,
      name: key,
      module: "TEST",
    })),
  },
];

describe("SCE-ADMIN-ACCESS-UX-01R3", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/tenant/effective-access/preview")) {
          return {
            ok: true,
            json: async () => ({
              summary: [],
              permissionKeys: [PERMISSIONS.ORG_VIEW],
              roleNamesByKey: {},
            }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );
  });

  it("uses compact toolbar grid and meaningful Zugriff column", () => {
    const { container } = render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    expect(container.querySelector(".lg\\:grid-cols-\\[minmax\\(12rem\\,1fr\\)_minmax\\(7\\.5rem\\,auto\\)_minmax\\(7\\.5rem\\,auto\\)_minmax\\(8rem\\,auto\\)_auto\\]")).toBeTruthy();
    expect(screen.getAllByText("Trainer/in").length).toBeGreaterThan(0);
    expect(screen.getAllByText("F2").length).toBeGreaterThan(0);
  });

  it("drawer renders last activity when dates are ISO strings (RSC)", async () => {
    render(
      <PersonAccessDrawer
        user={baseUser}
        open
        onClose={vi.fn()}
        currentUserId="u2"
        canManage={false}
        canInvite={false}
        privilegedRoleIds={[]}
        permissionModuleGroups={minimalModuleGroups}
        onEditAccess={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Letzte Aktivität:/i)).toBeTruthy();
    expect(screen.getByText(/2025/)).toBeTruthy();
  });

  it("people-access permission editor hides Alle deaktivieren", () => {
    render(
      <NavAlignedPermissionEditor
        moduleGroups={minimalModuleGroups}
        selectedKeys={new Set([PERMISSIONS.ORG_VIEW])}
        onChange={vi.fn()}
        peopleAccessMode
      />,
    );
    expect(screen.queryByRole("button", { name: /Alle deaktivieren/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Alles einblenden/i })).toBeTruthy();
  });
});
