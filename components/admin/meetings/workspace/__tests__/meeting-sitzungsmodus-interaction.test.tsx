// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  MeetingAgendaTimerProvider,
  useMeetingAgendaTimer,
} from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import {
  MeetingSitzungsmodusPanel,
  MeetingSitzungsmodusStartButton,
} from "@/components/admin/meetings/workspace/MeetingSitzungsmodusPanel";
import { MeetingSitzungsmodusStickyTimer } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusStickyTimer";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  loadMeetingAgendaTimerState,
  saveMeetingAgendaTimerState,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage";
import { createMeetingAgendaTimerState, startSitzungsmodus } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";

const SCOPE = { meetingId: "m-nov", tenantId: "t1", userId: "u1" };

const agendaItems = [
  {
    id: "ag-1",
    title: "Begrüssung",
    durationMin: 5,
    owner: "Präsident",
    ownerPersonId: null,
    initiativeId: null,
    notes: "",
    orderIndex: 1,
    status: "OPEN" as const,
    sourceAgendaItemId: null,
    initiative: null,
  },
  {
    id: "ag-2",
    title: "Finanzen",
    durationMin: 15,
    owner: "Kassier",
    ownerPersonId: null,
    initiativeId: null,
    notes: "",
    orderIndex: 2,
    status: "OPEN" as const,
    sourceAgendaItemId: null,
    initiative: null,
  },
] satisfies MeetingSubEntities["agendaItems"];

const displayOrder = new Map([
  ["ag-1", 1],
  ["ag-2", 2],
]);

function Harness({ children }: { children: React.ReactNode }) {
  return (
    <MeetingAgendaTimerProvider
      scope={SCOPE}
      canManage
      agendaItems={agendaItems}
      displayOrder={displayOrder}
    >
      {children}
    </MeetingAgendaTimerProvider>
  );
}

describe("Sitzungsmodus interaction (PO screenshots)", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private cb: IntersectionObserverCallback;
        constructor(cb: IntersectionObserverCallback) {
          this.cb = cb;
        }
        observe() {
          this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opening mode without a selected topic stays neutral", () => {
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("none");
    expect(screen.getByTestId("meeting-sitzungsmodus-topic-select")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-sitzungsmodus-countdown")).toBeNull();
    expect(screen.queryByText("Geplante Zeit abgelaufen")).toBeNull();
  });

  it("selecting a topic shows ready with planned duration", () => {
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("ready");
    expect(screen.getByTestId("meeting-sitzungsmodus-countdown")).toHaveTextContent("05:00");
    expect(screen.getByTestId("meeting-sitzungsmodus-context-line")).toHaveTextContent(
      "Traktandum 1 von 2 · Geplant: 5 Min.",
    );
    expect(screen.getByTestId("meeting-sitzungsmodus-primary-start")).toBeInTheDocument();
  });

  it("per-row start selects and starts the correct topic", () => {
    function RowStartButton() {
      const timer = useMeetingAgendaTimer();
      return (
        <button type="button" data-testid="meeting-agenda-timer-start-ag-2" onClick={() => timer?.startTopicAndTimer("ag-2")}>
          Timer starten
        </button>
      );
    }
    render(
      <Harness>
        <RowStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-agenda-timer-start-ag-2"));
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("running");
    expect(screen.getByTestId("meeting-sitzungsmodus-context-line")).toHaveTextContent("Traktandum 2 von 2");
    expect(screen.getByTestId("meeting-sitzungsmodus-countdown")).toHaveTextContent("15:00");
  });

  it("does not auto-start from selection alone", () => {
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-2" } });
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("ready");
    expect(screen.queryByTestId("meeting-sitzungsmodus-pause")).toBeNull();
  });

  it("zero warning occurs only after a running timer expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    try {
      render(
        <Harness>
          <MeetingSitzungsmodusStartButton />
          <MeetingSitzungsmodusPanel />
        </Harness>,
      );
      fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
      fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
      fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-primary-start"));
      expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("running");
      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000);
      });
      expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("expired");
      expect(screen.getByTestId("meeting-sitzungsmodus-countdown")).toHaveTextContent("00:00");
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalid restored topic returns to selection", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = {
      ...startSitzungsmodus(state),
      activeAgendaItemId: "stale-id",
      phase: "paused",
      remainingAtAnchorSec: -12,
      budgetSec: 300,
      activeTopicHasStarted: true,
    };
    saveMeetingAgendaTimerState(state);
    render(
      <Harness>
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("none");
    const loaded = loadMeetingAgendaTimerState(SCOPE, new Set(agendaItems.map((a) => a.id)));
    expect(loaded.activeAgendaItemId).toBeNull();
  });

  it("primary and secondary controls follow state", () => {
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
    expect(screen.getByTestId("meeting-sitzungsmodus-primary-start")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-sitzungsmodus-pause")).toBeNull();
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-primary-start"));
    expect(screen.getByTestId("meeting-sitzungsmodus-pause")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-sitzungsmodus-primary-start")).toBeNull();
    expect(screen.getByTestId("meeting-sitzungsmodus-extend")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-sitzungsmodus-chime")).toHaveTextContent("Ton aus");
  });

  it("sticky visibility follows mocked focus-card geometry", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        private cb: IntersectionObserverCallback;
        constructor(cb: IntersectionObserverCallback) {
          this.cb = cb;
        }
        observe() {
          this.cb([{ isIntersecting: false } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
        }
        disconnect() {}
      },
    );
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
        <MeetingSitzungsmodusStickyTimer />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
    expect(screen.queryByTestId("meeting-sitzungsmodus-sticky")).toBeNull();
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-primary-start"));
    expect(screen.getByTestId("meeting-sitzungsmodus-sticky")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-sitzungsmodus-sticky-lifecycle")).toHaveTextContent("running");
  });

  it("unsaved meeting input survives timer start, pause, topic switch and collapse", () => {
    function DraftWithTimer() {
      const [draft, setDraft] = useState("Protokoll-Entwurf November");
      return (
        <>
          <input
            data-testid="meeting-unsaved-draft"
            aria-label="Protokollnotiz"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <MeetingSitzungsmodusStartButton />
          <MeetingSitzungsmodusPanel />
        </>
      );
    }
    render(
      <Harness>
        <DraftWithTimer />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-primary-start"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-pause"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-next"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-collapse"));
    expect(screen.getByTestId("meeting-unsaved-draft")).toHaveValue("Protokoll-Entwurf November");
  });

  it("collapse preserves timer state in session storage", () => {
    render(
      <Harness>
        <MeetingSitzungsmodusStartButton />
        <MeetingSitzungsmodusPanel />
      </Harness>,
    );
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-start"));
    fireEvent.change(screen.getByLabelText("Traktandum wählen"), { target: { value: "ag-1" } });
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-primary-start"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-pause"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-collapse"));
    const loaded = loadMeetingAgendaTimerState(SCOPE, new Set(agendaItems.map((a) => a.id)));
    expect(loaded.modeActive).toBe(true);
    expect(loaded.activeAgendaItemId).toBe("ag-1");
    expect(loaded.phase).toBe("paused");
  });
});