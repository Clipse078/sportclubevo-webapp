// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MeetingTraktandumAgendaNotes } from "@/components/admin/meetings/workspace/MeetingTraktandumAgendaNotes";
import { resetTraktandumAgendaNotesDraftStoreForTests } from "@/lib/meetings/meeting-traktandum-agenda-notes-draft";

const { update, MockMeetingWorkspaceApiError } = vi.hoisted(() => {
  class MockMeetingWorkspaceApiError extends Error {
    code?: string;
    payload: Record<string, unknown>;
    constructor(message: string, _status: number, payload: Record<string, unknown> = {}) {
      super(message);
      this.code = typeof payload.code === "string" ? payload.code : undefined;
      this.payload = payload;
    }
  }
  return { update: vi.fn(), MockMeetingWorkspaceApiError };
});

vi.mock("@/lib/meetings/meeting-workspace-mutations", () => ({
  meetingWorkspaceApi: {
    agenda: {
      update,
    },
  },
  MeetingWorkspaceApiError: MockMeetingWorkspaceApiError,
}));

describe("MeetingTraktandumAgendaNotes", () => {
  beforeEach(() => {
    resetTraktandumAgendaNotesDraftStoreForTests();
    update.mockReset();
  });

  it("shows protocol notes and Vorhaben background separately", () => {
    render(
      <MeetingTraktandumAgendaNotes
        meetingId="m1"
        agendaItemId="a1"
        agendaItem={{
          notes: "Protokolltext",
          initiative: { summary: "Kontext aus Vorhaben", description: null } as never,
        }}
        canManage
        testIdPrefix="t"
        onNotesSaved={() => {}}
      />,
    );
    expect(screen.getByTestId("t-topic-background")).toHaveTextContent("Kontext aus Vorhaben");
    expect(screen.getByTestId("t-notes-body")).toHaveTextContent("Protokolltext");
  });

  it("preserves draft on conflict and surfaces server text", async () => {
    update.mockRejectedValueOnce(
      new MockMeetingWorkspaceApiError("Konflikt", 409, {
        code: "NOTES_CONFLICT",
        currentNotes: "Server-Stand",
      }),
    );
    const onNotesSaved = vi.fn();
    render(
      <MeetingTraktandumAgendaNotes
        meetingId="m1"
        agendaItemId="a1"
        agendaItem={{ notes: "Alt", initiative: null }}
        canManage
        testIdPrefix="t"
        onNotesSaved={onNotesSaved}
      />,
    );
    fireEvent.click(screen.getByTestId("t-notes-edit-trigger"));
    fireEvent.change(screen.getByTestId("t-notes-draft"), { target: { value: "Neu lokal" } });
    fireEvent.click(screen.getByTestId("t-notes-save"));
    await waitFor(() => expect(onNotesSaved).toHaveBeenCalledWith("Server-Stand"));
    expect(screen.getByTestId("t-notes-draft")).toHaveValue("Neu lokal");
  });
});