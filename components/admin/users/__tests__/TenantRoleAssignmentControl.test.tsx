/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import TenantRoleAssignmentControl from "@/components/admin/users/TenantRoleAssignmentControl";

beforeEach(() => {
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("TenantRoleAssignmentControl", () => {
  it("maps Forbidden to a German explanation and keeps pending toggles", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    );

    render(
      <TenantRoleAssignmentControl
        userId="user-1"
        canManage
        initialRoleIds={["role-a"]}
        availableRoles={[
          { id: "role-a", name: "Präsident (Pilot)", isSystem: false },
          { id: "role-b", name: "Vorstandsmitglied", isSystem: false },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Vorstandsmitglied aktivieren/));
    fireEvent.click(screen.getByRole("button", { name: /Änderungen speichern/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Keine Berechtigung/i);
    });

    expect(screen.getByRole("switch", { name: /Vorstandsmitglied/ })).toBeChecked();
    expect(refresh).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("shows unsaved hint while selection differs from persisted assignments", () => {
    render(
      <TenantRoleAssignmentControl
        userId="user-1"
        canManage
        initialRoleIds={["role-a"]}
        availableRoles={[
          { id: "role-a", name: "Rolle A", isSystem: false },
          { id: "role-b", name: "Rolle B", isSystem: false },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Rolle B aktivieren/));
    expect(screen.getByText(/Nicht gespeicherte Auswahl/)).toBeInTheDocument();
  });
});