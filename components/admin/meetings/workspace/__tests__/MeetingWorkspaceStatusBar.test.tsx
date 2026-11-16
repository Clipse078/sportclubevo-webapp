// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

import MeetingWorkspaceStatusBar from "@/components/admin/meetings/workspace/MeetingWorkspaceStatusBar";
import type { MeetingLiveData } from "@/lib/meetings/queries";

const baseMeeting: MeetingLiveData = {
  id: "meet-1",
  title: "Test-Sitzung",
  slug: "test-sitzung",
  description: null,
  meetingDate: new Date("2026-03-01T18:00:00Z"),
  location: null,
  attendeeCount: null,
  plannedDurationMin: 90,
  status: "PLANNED",
  reviewStage: "DRAFT",
  protocolApprovalRequired: false,
  protocolApprovalRule: "ALL",
  protocolApproverPersonIds: null,
  visibilityScope: "ORGANISATION",
  conductedAt: null,
  closedAt: null,
};

const baseProps = {
  meeting: baseMeeting,
  canManage: true,
  canDelete: true,
  participants: [],
  agendaItems: [],
  decisions: [],
  actions: [],
  slug: "test-sitzung",
};

describe("MeetingWorkspaceStatusBar — secondary menu & deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("does not render menu trigger when user cannot manage", () => {
    render(<MeetingWorkspaceStatusBar {...baseProps} canManage={false} />);
    expect(screen.queryByTestId("meeting-workspace-secondary-menu")).toBeNull();
  });

  it("opens portalled menu and returns focus on Escape", async () => {
    render(<MeetingWorkspaceStatusBar {...baseProps} />);
    const trigger = screen.getByTestId("meeting-workspace-secondary-menu");
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByTestId("meeting-workspace-summary-menu-popover")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("meeting-workspace-summary-menu-popover")).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("omits delete menu item without delete permission", async () => {
    render(<MeetingWorkspaceStatusBar {...baseProps} canDelete={false} />);
    fireEvent.click(screen.getByTestId("meeting-workspace-secondary-menu"));
    expect(await screen.findByTestId("meeting-print-protocol")).toBeTruthy();
    expect(screen.queryByTestId("meeting-delete-trigger")).toBeNull();
  });

  it("shows delete menu item when delete is authorized", async () => {
    render(<MeetingWorkspaceStatusBar {...baseProps} canDelete />);
    fireEvent.click(screen.getByTestId("meeting-workspace-secondary-menu"));
    expect(await screen.findByTestId("meeting-delete-trigger")).toBeTruthy();
  });

  it("opens inline delete confirm in page flow after menu selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        impact: { agendaItems: 1, decisions: 2, actions: 0, participants: 3 },
        requiresConfirmation: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MeetingWorkspaceStatusBar {...baseProps} />);
    fireEvent.click(screen.getByTestId("meeting-workspace-secondary-menu"));
    fireEvent.click(await screen.findByTestId("meeting-delete-trigger"));

    await waitFor(() => {
      expect(screen.getByTestId("meeting-delete-inline-confirm-host")).toBeTruthy();
    });
    expect(screen.getByTestId("meeting-delete-confirm")).toBeTruthy();
    expect(screen.queryByTestId("meeting-workspace-summary-menu-popover")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/meetings/meet-1/permanent", { method: "DELETE" });
  });

  it("cancels inline confirm without deleting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          impact: { agendaItems: 0, decisions: 0, actions: 0, participants: 0 },
        }),
      }),
    );

    render(<MeetingWorkspaceStatusBar {...baseProps} />);
    fireEvent.click(screen.getByTestId("meeting-workspace-secondary-menu"));
    fireEvent.click(await screen.findByTestId("meeting-delete-trigger"));
    await screen.findByTestId("meeting-delete-confirm");
    fireEvent.click(screen.getByTestId("meeting-delete-confirm-cancel"));
    expect(screen.queryByTestId("meeting-delete-inline-confirm-host")).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});