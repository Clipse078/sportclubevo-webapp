// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RoleDeleteButton from "@/components/admin/roles/RoleDeleteButton";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("RoleDeleteButton — inline destructive confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          impact: {
            activeUserCount: 2,
            totalUserRoleCount: 2,
            permissionCount: 4,
            workflowRuleCount: 0,
          },
        }),
      })),
    );
  });

  it("opens inline confirm with assignment impact", async () => {
    render(<RoleDeleteButton roleId="role-1" roleName="Testrolle" roleKey="custom_test" />);

    fireEvent.click(screen.getByTestId("role-delete-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("role-delete-inline-confirm-host")).toBeTruthy();
    });

    expect(screen.getByText(/Rollenzuweisung/)).toBeTruthy();
    expect(screen.getByTestId("role-delete-confirm-confirm")).toBeTruthy();
  });

  it("shows protected-role blocker inline without modal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          blocked: true,
          blocker: {
            reason: "SYSTEM_ROLE",
            message: "Geschützte Systemrolle.",
          },
        }),
      })),
    );

    render(<RoleDeleteButton roleId="role-sys" roleName="Club Admin" roleKey="club_admin" />);
    fireEvent.click(screen.getByTestId("role-delete-trigger"));

    await waitFor(() => {
      expect(screen.getByText("Geschützte Systemrolle.")).toBeTruthy();
    });
    expect(screen.queryByTestId("role-delete-confirm-confirm")).toBeNull();
  });
});