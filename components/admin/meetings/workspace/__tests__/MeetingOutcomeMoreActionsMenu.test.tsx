// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MeetingOutcomeMoreActionsMenu } from "@/components/admin/meetings/workspace/MeetingOutcomeMoreActionsMenu";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";

const previewRemoveMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@/lib/meetings/meeting-workspace-mutations", () => ({
  meetingWorkspaceApi: {
    decisions: {
      previewRemove: (...args: unknown[]) => previewRemoveMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
    },
    actions: {
      previewRemove: (...args: unknown[]) => previewRemoveMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
    },
  },
  MeetingWorkspaceApiError: class MeetingWorkspaceApiError extends Error {},
}));

const baseProps = {
  meetingId: "meet-1",
  recordId: "rec-1",
  recordTitle: "Test-Beschluss",
  kind: "decision" as const,
  canManage: true,
  onDeleted: vi.fn(),
  testIdPrefix: "meeting-outcome",
};

describe("MeetingOutcomeMoreActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewRemoveMock.mockResolvedValue({
      impact: { linkedActions: 0, linkedTasks: 0, agendaItemTitle: null },
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders portalled delete menu and returns focus on Escape", async () => {
    render(<MeetingOutcomeMoreActionsMenu {...baseProps} />);
    const trigger = screen.getByTestId("meeting-outcome-more-actions-trigger-rec-1");
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByTestId("meeting-outcome-more-actions-popover-rec-1")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("meeting-outcome-more-actions-popover-rec-1")).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("opens inline destructive confirm in document flow after delete selection", async () => {
    render(<MeetingOutcomeMoreActionsMenu {...baseProps} />);
    fireEvent.click(screen.getByTestId("meeting-outcome-more-actions-trigger-rec-1"));
    fireEvent.click(await screen.findByTestId("meeting-outcome-delete-trigger-rec-1"));
    expect(await screen.findByTestId("meeting-outcome-delete-confirm-rec-1")).toBeTruthy();
    expect(screen.queryByTestId("meeting-outcome-more-actions-popover-rec-1")).toBeNull();
    expect(previewRemoveMock).toHaveBeenCalledWith("meet-1", "rec-1");
  });

  it("does not toggle an ancestor accordion when opening the menu", () => {
    render(
      <SceExpandablePanel
        testId="decision-accordion"
        summary={
          <div className="flex w-full justify-between">
            <span>Beschluss</span>
            <MeetingOutcomeMoreActionsMenu {...baseProps} />
          </div>
        }
      >
        <p>Details</p>
      </SceExpandablePanel>,
    );
    const accordionButton = screen.getByTestId("decision-accordion").querySelector("button")!;
    expect(accordionButton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByTestId("meeting-outcome-more-actions-trigger-rec-1"));
    expect(accordionButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Details")).toBeNull();
  });
});