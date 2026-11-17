/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MeetingTraktandumOutcomeActions } from "@/components/admin/meetings/workspace/MeetingTraktandumOutcomeActions";
import { resetTraktandumOutcomeDraftStoreForTests } from "@/lib/meetings/sitzungsmodus/meeting-traktandum-outcome-draft";

vi.mock("@/lib/meetings/meeting-workspace-mutations", () => ({
  MeetingWorkspaceApiError: class MeetingWorkspaceApiError extends Error {
    status = 409;
    code = "NOTES_CONFLICT";
    payload: Record<string, unknown>;
    constructor(message: string, status: number, payload: Record<string, unknown>) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  },
  meetingWorkspaceApi: {
    decisions: { create: vi.fn().mockResolvedValue({ decision: { id: "d1" } }) },
    actions: { create: vi.fn().mockResolvedValue({}) },
    agenda: { update: vi.fn().mockResolvedValue({ item: { notes: "merged" } }) },
  },
}));

import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";

describe("MeetingTraktandumOutcomeActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTraktandumOutcomeDraftStoreForTests();
  });

  it("shows meeting and Traktandum context on both entry surfaces", () => {
    render(
      <MeetingTraktandumOutcomeActions
        meetingId="m1"
        meetingTitle="Vereinsleitungssitzung"
        agendaItemId="a1"
        agendaTitle="Finanzen"
        agendaPosition={2}
        agendaNotes={null}
        canManage
        testIdPrefix="test"
        onDecisionCreated={vi.fn()}
        onActionCreated={vi.fn()}
        onNotesUpdated={vi.fn()}
      />,
    );
    expect(screen.getByTestId("test-outcome-context")).toHaveTextContent("Vereinsleitungssitzung");
    expect(screen.getByTestId("test-outcome-context")).toHaveTextContent("Traktandum 2");
    expect(screen.getByTestId("test-outcome-context")).toHaveTextContent("Finanzen");
  });

  it("creates Beschluss with sourceAgendaItemId", async () => {
    const onDecisionCreated = vi.fn();
    render(
      <MeetingTraktandumOutcomeActions
        meetingId="m1"
        meetingTitle="Sitzung"
        agendaItemId="a1"
        agendaTitle="Budget"
        agendaPosition={1}
        agendaNotes={null}
        canManage
        testIdPrefix="test"
        onDecisionCreated={onDecisionCreated}
        onActionCreated={vi.fn()}
        onNotesUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("test-outcome-decision-trigger"));
    fireEvent.change(screen.getByPlaceholderText("Kurzform"), { target: { value: "Budget genehmigt" } });
    fireEvent.click(screen.getByRole("button", { name: /Speichern/i }));
    await vi.waitFor(() => {
      expect(meetingWorkspaceApi.decisions.create).toHaveBeenCalledWith("m1", {
        title: "Budget genehmigt",
        description: null,
        rationale: null,
        sourceAgendaItemId: "a1",
        status: "CONFIRMED",
      });
      expect(onDecisionCreated).toHaveBeenCalled();
    });
  });

  it("creates Pendenz with linkedRefs agenda link", async () => {
    const onActionCreated = vi.fn();
    render(
      <MeetingTraktandumOutcomeActions
        meetingId="m1"
        meetingTitle="Sitzung"
        agendaItemId="a1"
        agendaTitle="Budget"
        agendaPosition={1}
        agendaNotes={null}
        canManage
        testIdPrefix="test"
        onDecisionCreated={vi.fn()}
        onActionCreated={onActionCreated}
        onNotesUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("test-outcome-pendenz-trigger"));
    fireEvent.change(screen.getByPlaceholderText("Was ist zu tun?"), { target: { value: "Angebot einholen" } });
    fireEvent.click(screen.getByRole("button", { name: /Speichern/i }));
    await vi.waitFor(() => {
      expect(meetingWorkspaceApi.actions.create).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({
          title: "Angebot einholen",
          linkedRefs: { agendaItemId: "a1" },
        }),
      );
      expect(onActionCreated).toHaveBeenCalled();
    });
  });

  it("links Pendenz after Beschluss with agenda and decision refs", async () => {
    const onActionCreated = vi.fn();
    render(
      <MeetingTraktandumOutcomeActions
        meetingId="m1"
        meetingTitle="Sitzung"
        agendaItemId="a1"
        agendaTitle="Budget"
        agendaPosition={1}
        agendaNotes={null}
        canManage
        testIdPrefix="test"
        onDecisionCreated={vi.fn()}
        onActionCreated={onActionCreated}
        onNotesUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("test-outcome-decision-trigger"));
    fireEvent.change(screen.getByPlaceholderText("Kurzform"), { target: { value: "Budget genehmigt" } });
    fireEvent.click(screen.getByRole("button", { name: /Speichern/i }));
    await vi.waitFor(() => expect(screen.getByTestId("test-beschluss-follow-up")).toBeTruthy());
    fireEvent.click(screen.getByTestId("test-pendenz-follow-up-trigger"));
    fireEvent.change(screen.getByPlaceholderText("Was ist zu tun?"), { target: { value: "Umsetzen" } });
    fireEvent.click(screen.getByRole("button", { name: /Speichern/i }));
    await vi.waitFor(() => {
      expect(meetingWorkspaceApi.actions.create).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({
          linkedRefs: { agendaItemId: "a1", decisionId: "d1" },
        }),
      );
    });
  });

  it("offers Pendenz dazu erstellen after Beschluss without auto-creating", async () => {
    render(
      <MeetingTraktandumOutcomeActions
        meetingId="m1"
        meetingTitle="Sitzung"
        agendaItemId="a1"
        agendaTitle="Budget"
        agendaPosition={1}
        agendaNotes={null}
        canManage
        testIdPrefix="test"
        onDecisionCreated={vi.fn()}
        onActionCreated={vi.fn()}
        onNotesUpdated={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("test-outcome-decision-trigger"));
    fireEvent.change(screen.getByPlaceholderText("Kurzform"), { target: { value: "Budget genehmigt" } });
    fireEvent.click(screen.getByRole("button", { name: /Speichern/i }));
    await vi.waitFor(() => {
      expect(screen.getByTestId("test-beschluss-follow-up")).toBeTruthy();
    });
    expect(meetingWorkspaceApi.actions.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("test-pendenz-follow-up-trigger"));
    expect(screen.getByDisplayValue("Umsetzung: Budget genehmigt")).toBeTruthy();
  });

  it("shares draft state between focus and expanded row surfaces", () => {
    const shared = {
      meetingId: "m1",
      meetingTitle: "Sitzung",
      agendaItemId: "a1",
      agendaTitle: "Budget",
      agendaPosition: 1,
      agendaNotes: null as string | null,
      canManage: true,
      onDecisionCreated: vi.fn(),
      onActionCreated: vi.fn(),
      onNotesUpdated: vi.fn(),
    };
    render(
      <>
        <MeetingTraktandumOutcomeActions {...shared} testIdPrefix="focus" />
        <MeetingTraktandumOutcomeActions {...shared} testIdPrefix="row" />
      </>,
    );
    fireEvent.click(screen.getByTestId("focus-outcome-decision-trigger"));
    fireEvent.change(screen.getAllByPlaceholderText("Kurzform")[0]!, { target: { value: "Geteilter Entwurf" } });
    expect(screen.getAllByDisplayValue("Geteilter Entwurf")).toHaveLength(2);
  });
});