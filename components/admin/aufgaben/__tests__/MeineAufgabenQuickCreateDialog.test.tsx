/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/app/(admin)/dashboard/aufgaben/actions", () => ({
  createQuickAufgabeAction: vi.fn(),
  searchQuickCreateAssigneesAction: vi.fn().mockResolvedValue({ ok: true, options: [] }),
}));

import MeineAufgabenQuickCreateDialog from "../MeineAufgabenQuickCreateDialog";

describe("MeineAufgabenQuickCreateDialog", () => {
  it("opens inline collapsible card with default assignee", async () => {
    render(
      <MeineAufgabenQuickCreateDialog
        canCreateSelf
        canAssignOthers={false}
        timeZone="Europe/Zurich"
        currentUser={{
          userId: "u-self",
          firstName: "Sam",
          lastName: "Tester",
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("meine-aufgaben-create-open"));
    expect(await screen.findByTestId("meine-aufgaben-create-inline-card")).toBeInTheDocument();
    expect(screen.getByTestId("meine-aufgaben-create-assignees")).toHaveTextContent("Sam Tester");
  });
});
