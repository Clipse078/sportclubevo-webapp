/**
 * @vitest-environment jsdom
 * SCE-ADMIN-ACCESS-UX-01 — People & Access UX
 */

import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import PeopleAccessWizard from "@/components/admin/users/people-access/PeopleAccessWizard";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";
import { getRoleProductDescription, isClubAdminRoleKey } from "@/lib/admin/people-access/role-product-copy";
import { userHasPlatformSystemIdentity } from "@/lib/admin/people-access/platform-identity";
import type { TenantUserItem } from "@/lib/users/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const wizardRoles = [
  {
    id: "r-trainer",
    name: "Trainer/in",
    key: "trainer",
    isSystem: true,
    description: null,
  },
  {
    id: "r-admin",
    name: "Club Admin",
    key: "club_admin__test",
    isSystem: true,
    description: "Administration",
  },
];

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
  scopedRoles: [{ id: "r-trainer", name: "Trainer/in", key: "trainer", orgUnitId: "ou1", orgUnitName: "F2" }],
  platformRoles: [],
  isPlatformSystemIdentity: false,
  linkedPersonId: null,
  linkedPersonName: null,
  pendingInvitation: false,
};

describe("SCE-ADMIN-ACCESS-UX-01", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/tenant/effective-access/preview")) {
          return {
            ok: true,
            json: async () => ({
              summary: [{ module: "TRAININGS", moduleLabel: "Planung", items: ["Trainings verwalten"], hasAccess: true }],
            }),
          } as Response;
        }
        if (url.includes("/api/admin/users/lookup")) {
          return { ok: true, json: async () => ({ result: { kind: "not_found" } }) } as Response;
        }
        if (url.includes("/api/admin/users/validate-email")) {
          return {
            ok: true,
            json: async () => ({ ok: true, code: "VALID", normalized: "max@test.ch" }),
          } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      }),
    );
  });

  it("renders summary metrics and opens wizard with 4 steps", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite
        wizardConfig={{
          availableRoles: wizardRoles,
          availableOrgUnits: [{ id: "ou1", name: "F2" }],
          permissionModuleGroups: [],
          clubAdminRoleKey: "club_admin__test",
          privilegedRoleIds: ["r-admin"],
        }}
      />,
    );

    expect(screen.getByText("aktive Zugänge")).toBeTruthy();
    expect(screen.getByText("Admin-Zugänge")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Person hinzufügen/i }));
    expect(screen.getByText("Funktion & Bereich")).toBeTruthy();
    expect(screen.getByText("Prüfen & Einladen")).toBeTruthy();
  });

  it("search filters by name", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser, { ...baseUser, userId: "u2", name: "Anna Beispiel", email: "anna@test.ch" }]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Name oder E-Mail suchen/i), {
      target: { value: "Anna" },
    });
    expect(screen.getByText("Anna Beispiel")).toBeTruthy();
    expect(screen.queryByText("Max Muster")).toBeNull();
  });

  it("status filter active", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser, { ...baseUser, userId: "u2", membershipIsActive: false, name: "Inaktiv User" }]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Status filtern"), { target: { value: "active" } });
    expect(screen.getByText("Max Muster")).toBeTruthy();
    expect(screen.queryByText("Inaktiv User")).toBeNull();
  });

  it("table shows Funktion and Bereich columns", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    expect(screen.getByText("Person")).toBeTruthy();
    expect(screen.getByText("Zugriff")).toBeTruthy();
    expect(screen.getAllByText(/F2/).length).toBeGreaterThan(0);
  });

  it("wizard requires email on step 1", () => {
    render(
      <PeopleAccessWizard
        availableRoles={wizardRoles}
        availableOrgUnits={[]}
        clubAdminRoleKey="club_admin__test"
        privilegedRoleIds={["r-admin"]}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    const weiter = screen.getByRole("button", { name: "Weiter" });
    expect((weiter as HTMLButtonElement).disabled).toBe(true);
  });

  it("privileged role warning requires confirmation", async () => {
    render(
      <PeopleAccessWizard
        availableRoles={wizardRoles}
        availableOrgUnits={[]}
        clubAdminRoleKey="club_admin__test"
        privilegedRoleIds={["r-admin"]}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), {
      target: { value: "new@fcallschwil.ch" },
    });
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "Neu" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "Person" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));

    const adminCheckbox = await waitFor(() => screen.getByRole("checkbox", { name: /Club Admin/i }));
    fireEvent.click(adminCheckbox);
    expect(screen.getByText(/Vereinsweiter administrativer Zugriff/i)).toBeTruthy();
    const next = screen.getByRole("button", { name: "Weiter" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich bestätige/i }));
    expect((next as HTMLButtonElement).disabled).toBe(false);
  });

  it("excludes platform roles from assignable list in wizard", async () => {
    render(
      <PeopleAccessWizard
        availableRoles={[
          ...wizardRoles,
          { id: "p1", name: "Super Admin", key: "super_admin", isSystem: true, description: null },
        ]}
        availableOrgUnits={[]}
        clubAdminRoleKey="club_admin__test"
        privilegedRoleIds={[]}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/E-Mail-Adresse/i), { target: { value: "person@fcallschwil.ch" } });
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "B" } });
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: /Super Admin/i })).toBeNull());
  });

  it("duplicate role chips grouped", () => {
    const chips = groupRoleChipsForDisplay([
      { id: "a", name: "Club Admin", key: "club_admin__x" },
      { id: "b", name: "Club Admin", key: "club_admin_x" },
    ]);
    expect(chips[0]?.assignmentCount).toBe(2);
  });

  it("platform identity helper", () => {
    expect(userHasPlatformSystemIdentity([{ key: "super_admin", scope: "PLATFORM" }])).toBe(true);
    expect(userHasPlatformSystemIdentity([{ key: "trainer", scope: "TENANT" }])).toBe(false);
  });

  it("role product copy avoids raw permission keys", () => {
    const desc = getRoleProductDescription({ key: "trainer", description: null });
    expect(desc).not.toMatch(/users\./);
    expect(desc.length).toBeGreaterThan(5);
  });

  it("club admin is tenant-wide", () => {
    expect(isClubAdminRoleKey("club_admin__test", "club_admin__test")).toBe(true);
  });

  it("opens access drawer on row click", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
        canManage
        wizardConfig={{
          availableRoles: wizardRoles,
          availableOrgUnits: [],
          permissionModuleGroups: [],
          clubAdminRoleKey: "club_admin__test",
          privilegedRoleIds: [],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Max Muster — Zugriff anzeigen/i }));
    expect(screen.getByText("Übersicht")).toBeTruthy();
    expect(screen.getByText("Funktionen")).toBeTruthy();
  });

  it("protected platform user shows Systemzugang badge", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[{ ...baseUser, isPlatformSystemIdentity: true, platformRoles: [{ id: "p", name: "Super Admin", key: "super_admin" }] }]}
        personsWithoutUser={[]}
        currentUserId="u2"
        canInvite={false}
      />,
    );
    expect(screen.getAllByText("Systemzugang").length).toBeGreaterThan(0);
  });
});
