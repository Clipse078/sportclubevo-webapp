/**
 * @vitest-environment jsdom
 * VL access / People & Access inline journey (no modal-drawer)
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TenantUsersSearchableList from "@/components/admin/users/TenantUsersSearchableList";
import type { TenantUserItem } from "@/lib/users/queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseUser: TenantUserItem = {
  userId: "u-patrick",
  firstName: "Patrick",
  lastName: "Scotton",
  name: "Patrick Scotton",
  email: "patrick.scotton@fcallschwil.ch",
  userIsActive: true,
  membershipIsActive: true,
  joinedAt: new Date("2024-01-01"),
  lastLoginAt: new Date("2025-01-01"),
  roles: [{ id: "r-president", name: "Präsident (Pilot)", key: "pilot_praesident" }],
  scopedRoles: [],
  platformRoles: [],
  isPlatformSystemIdentity: false,
  linkedPersonId: "p1",
  linkedPersonName: "Patrick Scotton",
  pendingInvitation: false,
};

describe("SCE-ADMIN-ACCESS-UX-01R6 — inline people-access", () => {
  it("uses compact status summary instead of five KPI cards", () => {
    render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u-admin"
        canInvite={false}
      />,
    );
    expect(screen.getByTestId("people-access-status-summary")).toBeTruthy();
    expect(screen.queryByText("aktive Zugänge")).toBeNull();
  });

  it("expands inline overview without Sheet/Dialog on row activate", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ summary: [], permissionKeys: ["meetings.view"] }),
      })) as unknown as typeof fetch,
    );
    const { container } = render(
      <TenantUsersSearchableList
        initialUsers={[baseUser]}
        personsWithoutUser={[]}
        currentUserId="u-admin"
        canInvite={false}
        canManage
        wizardConfig={{
          availableRoles: [],
          availableOrgUnits: [],
          permissionModuleGroups: [],
          clubAdminRoleKey: "club_admin__test",
          privilegedRoleIds: [],
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("people-access-row-u-patrick"));
    expect(screen.getByTestId("people-access-inline-overview-u-patrick")).toBeTruthy();
    expect(container.querySelector('[data-state="open"]')).toBeNull();
  });
});