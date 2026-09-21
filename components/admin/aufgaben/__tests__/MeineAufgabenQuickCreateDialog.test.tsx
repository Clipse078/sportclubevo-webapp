/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/aufgaben/actions", () => ({
  createQuickAufgabeAction: vi.fn().mockResolvedValue({ ok: true, taskId: "t1" }),
}));

import MeineAufgabenQuickCreateDialog from "../MeineAufgabenQuickCreateDialog";

describe("MeineAufgabenQuickCreateDialog", () => {
  const currentUser = {
    userId: "u1",
    firstName: "Michael",
    lastName: "Duijster",
  };

  it("opens dialog with current user pre-selected", () => {
    render(
      <MeineAufgabenQuickCreateDialog
        canCreateSelf
        canAssignOthers={false}
        currentUser={currentUser}
        assigneeOptions={[]}
        timeZone="Europe/Zurich"
      />,
    );

    fireEvent.click(screen.getByTestId("meine-aufgaben-create-open"));
    expect(screen.getByTestId("meine-aufgaben-create-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("meine-aufgaben-create-assignees")).toHaveTextContent(
      "Michael Duijster",
    );
  });
});
