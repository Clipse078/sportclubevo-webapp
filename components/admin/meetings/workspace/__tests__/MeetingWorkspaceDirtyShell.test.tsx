// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import {
  MeetingWorkspaceDirtyShell,
  MeetingWorkspaceDirtyStateSync,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";

describe("MeetingWorkspaceDirtyShell", () => {
  it("shows unsaved dialog when navigating away with dirty inline edits", () => {
    push.mockClear();

    render(
      <MeetingWorkspaceDirtyShell>
        <MeetingWorkspaceDirtyStateSync isDirty />
        <a href="/vereinsleitung/meetings" data-testid="leave-link">
          Liste
        </a>
      </MeetingWorkspaceDirtyShell>,
    );

    fireEvent.click(screen.getByTestId("leave-link"));
    expect(screen.getByRole("heading", { name: "Ungespeicherte Änderungen" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates after discarding dirty changes", () => {
    push.mockClear();

    render(
      <MeetingWorkspaceDirtyShell>
        <MeetingWorkspaceDirtyStateSync isDirty />
        <a href="/vereinsleitung/meetings" data-testid="leave-link">
          Liste
        </a>
      </MeetingWorkspaceDirtyShell>,
    );

    fireEvent.click(screen.getByTestId("leave-link"));
    fireEvent.click(screen.getByTestId("sce-unsaved-discard"));
    expect(push).toHaveBeenCalledWith("/vereinsleitung/meetings");
  });
});
