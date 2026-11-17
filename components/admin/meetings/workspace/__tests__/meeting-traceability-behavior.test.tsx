/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskStatus } from "@prisma/client";
import { MeetingOutcomeOriginLinks } from "@/components/admin/meetings/workspace/MeetingOutcomeOriginLinks";
import { MeetingTraktandumOutcomeActions } from "@/components/admin/meetings/workspace/MeetingTraktandumOutcomeActions";
import {
  readTraktandumOutcomeDraft,
  patchTraktandumOutcomeDraft,
  resetTraktandumOutcomeDraftStoreForTests,
} from "@/lib/meetings/sitzungsmodus/meeting-traktandum-outcome-draft";
import { buildMeetingDecisionDeepLink } from "@/lib/meetings/meeting-traktandum-navigation";
import {
  mergeAgendaLinkedTaskSummaries,
  reconcileAgendaLinkedTasksWithServer,
} from "@/lib/meetings/agenda-linked-task-state";

vi.mock("@/lib/meetings/meeting-workspace-mutations", () => ({
  MeetingWorkspaceApiError: class MeetingWorkspaceApiError extends Error {},
  meetingWorkspaceApi: {
    decisions: { create: vi.fn() },
    actions: { create: vi.fn() },
    agenda: { update: vi.fn() },
  },
}));

const taskBase = {
  title: "Follow-up",
  status: TaskStatus.OPEN,
  dueAt: null,
  assigneeLabel: null,
  createdAt: new Date("2026-11-17T10:00:00Z"),
  decisionId: null,
};

describe("meeting traceability behavior", () => {
  beforeEach(() => {
    resetTraktandumOutcomeDraftStoreForTests();
  });

  it("renders restricted origin without leaking href", () => {
    render(
      <MeetingOutcomeOriginLinks
        origin={{
          links: [{ label: "Geheime Sitzung", href: "/secret", restricted: true }],
        }}
        testId="origin"
      />,
    );
    expect(screen.getByTestId("origin")).toHaveTextContent("Eingeschränkter Bezug");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("updates Ergebnisse Aufgabe row when agendaLinkedTasks gains a canonical task", () => {
    const onCreated = vi.fn();
    const shared = {
      meetingId: "m1",
      meetingSlug: "november",
      meetingTitle: "Sitzung",
      agendaItemId: "a1",
      agendaTitle: "Traktandum",
      agendaPosition: 1,
      agendaNotes: null as string | null,
      canManage: true,
      testIdPrefix: "traktandum-outcome",
      onDecisionCreated: vi.fn(),
      onActionCreated: vi.fn(),
      onNotesUpdated: vi.fn(),
      decisions: [] as const,
      actions: [] as const,
      onTaskCreated: onCreated,
    };

    const { rerender } = render(
      <MeetingTraktandumOutcomeActions {...shared} agendaLinkedTasks={[]} />,
    );
    expect(screen.queryByTestId("traktandum-outcome-ergebnisse")).toBeNull();

    rerender(
      <MeetingTraktandumOutcomeActions
        {...shared}
        agendaLinkedTasks={[{ ...taskBase, id: "t1", agendaItemId: "a1" }]}
      />,
    );
    expect(screen.getByTestId("traktandum-outcome-ergebnis-AUFGABE-t1")).toBeInTheDocument();
  });

  it("deduplicates task counts after server reconciliation", () => {
    const optimistic = [{ ...taskBase, id: "t1", agendaItemId: "a1", title: "Client" }];
    const server = [{ ...taskBase, id: "t1", agendaItemId: "a1", title: "Server" }];
    const merged = reconcileAgendaLinkedTasksWithServer(
      mergeAgendaLinkedTaskSummaries([], optimistic),
      server,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("Client");
  });

  it("builds decision deep link with focus param and section hash", () => {
    const href = buildMeetingDecisionDeepLink("november-2026", "d99");
    expect(href).toContain("focusDecision=d99");
    expect(href).toContain("meeting-workspace-section-beschluesse");
  });

  it("retains unrelated Traktandum draft fields when recording a new Aufgabe", () => {
    patchTraktandumOutcomeDraft("m1", "a1", {
      pendenzTitle: "Offen",
      noteText: "Timer notiert",
    });
    patchTraktandumOutcomeDraft("m1", "a1", {
      aufgabeLastTaskId: "t-new",
      activeForm: null,
    });
    const draft = readTraktandumOutcomeDraft("m1", "a1");
    expect(draft?.pendenzTitle).toBe("Offen");
    expect(draft?.noteText).toBe("Timer notiert");
    expect(draft?.aufgabeLastTaskId).toBe("t-new");
  });
});