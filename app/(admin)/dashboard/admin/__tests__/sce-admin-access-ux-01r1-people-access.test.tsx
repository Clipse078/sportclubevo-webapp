/**
 * @vitest-environment jsdom
 * SCE-ADMIN-ACCESS-UX-01R1 — theme, duplicate roles, permission UX (read-only baseline)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import PeopleAccessWizard from "@/components/admin/users/people-access/PeopleAccessWizard";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
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
  joinedAt: new Date("2024-01-01"),
  lastLoginAt: new Date("2025-01-01"),
  roles: [{ id: "r-trainer", name: "Trainer/in", key: "trainer" }],
  scopedRoles: [],
  platformRoles: [],
  isPlatformSystemIdentity: false,
  linkedPersonId: null,
  linkedPersonName: null,
  pendingInvitation: false,
};

const duplicateClubAdminRoles = [
  { id: "ca-legacy", name: "Club Admin", key: "club_admin_fc_x", isSystem: false, description: null },
  { id: "ca-canon", name: "Club Admin", key: "club_admin__test", isSystem: true, description: null },
  { id: "r-trainer", name: "Trainer/in", key: "trainer", isSystem: true, description: null },
];

const ROLE_EDITOR_CATALOG = [
  PERMISSIONS.ORG_VIEW,
  PERMISSIONS.ORG_MANAGE,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_MANAGE,
  PERMISSIONS.PEOPLE_VIEW,
  PERMISSIONS.PEOPLE_MANAGE,
];

const minimalModuleGroups = [
  {
    module: "TEST",
    permissions: ROLE_EDITOR_CATALOG.map((key, index) => ({
      id: String(index + 1),
      key,
      name: key,
      module: "TEST",
    })),
  },
];

describe("SCE-ADMIN-ACCESS-UX-01R1", () => {
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
              roleNamesByKey: { [PERMISSIONS.ORG_VIEW]: ["Trainer/in"] },
            }),
          } as Response;
        }
        if (url.includes("/api/admin/users/lookup")) {
          return { ok: true, json: async () => ({ result: { kind: "not_found" } }) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );
  });

  it("filter controls use fca-input (dark SCE form styling)", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    const status = screen.getByLabelText("Status filtern");
    expect(status.className).toMatch(/fca-input/);
    const scope = screen.getByLabelText("Bereich filtern");
    expect(scope.className).toMatch(/fca-input/);
  });

  it("wizard shows only one Club Admin role card when legacy duplicates exist", () => {
    render(
      <PeopleAccessWizard
        availableRoles={duplicateClubAdminRoles}
        availableOrgUnits={[]}
        permissionModuleGroups={minimalModuleGroups}
        clubAdminRoleKey="club_admin__test"
        privilegedRoleIds={["ca-canon"]}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), { target: { value: "a@b.ch" } });
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    const clubAdminLabels = screen.getAllByText("Club Admin");
    expect(clubAdminLabels.length).toBe(1);
  });

  it("permission panel uses nav-aligned editor without permission checkboxes", () => {
    const { container } = render(
      <PeopleAccessPermissionPanel
        moduleGroups={minimalModuleGroups}
        permissionKeys={[PERMISSIONS.ORG_VIEW]}
        roleNamesByKey={{ [PERMISSIONS.ORG_VIEW]: ["Trainer/in"] }}
        primaryRoleLabel="Trainer/in"
      />,
    );
    expect(screen.getByText(/freigegeben ·/i)).toBeTruthy();
    expect(screen.getByText(/Module & Berechtigungen/i)).toBeTruthy();
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(0);
  });

  it("access step shows role baseline summary in wizard", async () => {
    render(
      <PeopleAccessWizard
        availableRoles={[duplicateClubAdminRoles[2]!]}
        availableOrgUnits={[]}
        permissionModuleGroups={minimalModuleGroups}
        clubAdminRoleKey="club_admin__test"
        privilegedRoleIds={[]}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), { target: { value: "a@b.ch" } });
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Trainer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    expect(await screen.findByText(/freigegeben ·/i)).toBeTruthy();
    expect(screen.getByText(/Backend-Erweiterung/i)).toBeTruthy();
  });

  it("list table container uses surface token not hardcoded white", () => {
    const { container } = render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    const surface = container.querySelector(".bg-\\[var\\(--surface\\)\\]");
    expect(surface).toBeTruthy();
  });
});
