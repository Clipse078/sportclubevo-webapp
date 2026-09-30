/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
import TenantRoleAssignmentControl from "@/components/admin/users/TenantRoleAssignmentControl";
import PersonNavEffectiveAccessView from "@/components/admin/users/PersonNavEffectiveAccessView";
import MembershipAccessControl from "@/components/admin/users/MembershipAccessControl";

describe("SCE-FCA Person Detail UX", () => {
  it("renders role assignment with switch controls, not checkboxes", () => {
    render(
      <TenantRoleAssignmentControl
        userId="u-1"
        canManage
        initialRoleIds={["r-1"]}
        availableRoles={[
          { id: "r-1", name: "Spielbetrieb Koordinator", isSystem: false },
          { id: "r-2", name: "Präsident (Pilot)", isSystem: false },
        ]}
      />,
    );

    expect(screen.getAllByRole("switch")).toHaveLength(2);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows human-readable German effective access labels", () => {
    render(
      <PersonNavEffectiveAccessView
        sections={[
          {
            label: "Tagesbetrieb",
            modules: ["Wochenplaner"],
            items: [{ label: "Wochenplaner", access: "Ansehen" }],
          },
        ]}
      />,
    );

    expect(screen.getByText("Tagesbetrieb")).toBeTruthy();
    expect(screen.getByText("Wochenplaner")).toBeTruthy();
    expect(screen.getByText(/Ansehen/)).toBeTruthy();
    expect(screen.queryByText("planning.allocations.view")).toBeNull();
  });

  it("pending invitation does not show Zugriff gesperrt in membership control", () => {
    render(
      <MembershipAccessControl
        userId="u-1"
        userName="Sandra Fischer"
        userEmail="sandra@example.com"
        membershipIsActive={false}
        userIsActive
        pendingInvitation
        canManage
        isSelf={false}
      />,
    );

    expect(screen.getByText("Einladung ausstehend")).toBeTruthy();
    expect(screen.queryByText("Zugriff gesperrt")).toBeNull();
    expect(screen.queryByText("Zugriff wiederherstellen")).toBeNull();
  });
});
