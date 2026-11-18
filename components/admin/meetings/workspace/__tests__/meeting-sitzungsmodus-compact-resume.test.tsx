// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MeetingAgendaTimerProvider,
  useMeetingAgendaTimer,
} from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MeetingSitzungsmodusCompactResume } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusCompactResume";
import type { MeetingSubEntities } from "@/lib/meetings/queries";

const SCOPE = { meetingId: "m-1", tenantId: "t1", userId: "u1" };

const agendaItems = [
  {
    id: "ag-1",
    title: "Offen",
    durationMin: 5,
    owner: null,
    ownerPersonId: null,
    initiativeId: null,
    notes: "",
    orderIndex: 0,
    status: "OPEN" as const,
    sourceAgendaItemId: null,
    initiative: null,
  },
] satisfies MeetingSubEntities["agendaItems"];

const actions = [
  {
    id: "ac-1",
    title: "Noch offen",
    status: "OPEN" as const,
    meetingId: "m-1",
    owner: null,
    ownerPersonId: null,
    dueDate: null,
    linkedRefs: [],
    orderIndex: 0,
  },
] satisfies MeetingSubEntities["actions"];

function StartModeOnly() {
  const timer = useMeetingAgendaTimer();
  return (
    <button type="button" data-testid="start-mode" onClick={() => timer?.startMode()}>
      Start mode
    </button>
  );
}

describe("MeetingSitzungsmodusCompactResume", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows inline end-session summary when gaps exist", () => {
    render(
      <MeetingAgendaTimerProvider scope={SCOPE} canManage agendaItems={agendaItems} displayOrder={new Map([["ag-1", 1]])}>
        <StartModeOnly />
        <MeetingSitzungsmodusCompactResume agendaItems={agendaItems} actions={actions} />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-mode"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-end"));
    expect(screen.getByTestId("meeting-sitzungsmodus-session-summary")).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});