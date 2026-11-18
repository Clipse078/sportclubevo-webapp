// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MeetingAgendaTimerProvider,
  useMeetingAgendaTimer,
} from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MeetingSitzungsmodusFocusExperience } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusFocusExperience";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { createMeetingAgendaTimerState, startSitzungsmodus, startAgendaTimer, selectAgendaTopic, resolveAgendaBudgetSec } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";
import { saveMeetingAgendaTimerState } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage";

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

const meeting: MeetingLiveData = {
  id: "m-nov",
  title: "Vereinsleitungssitzung",
  slug: "vereinsleitungssitzung-november-2026",
  meetingDate: new Date("2026-11-15T18:30:00Z"),
  plannedDurationMin: 90,
  status: "PLANNED",
} as MeetingLiveData;

const fmtCfg: TenantFormatConfig = { locale: "de-CH", timezone: "Europe/Zurich" };

const displayOrder = new Map([
  ["ag-1", 1],
  ["ag-2", 2],
]);

function StartFocusHarness() {
  const timer = useMeetingAgendaTimer();
  return (
  <button
    type="button"
    data-testid="start-focus"
    onClick={() => {
      timer?.startMode();
      timer?.enterFocusPresentation();
    }}
  >
    Start
  </button>
  );
}

describe("Sitzungsmodus focus experience", () => {
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
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-meeting-sitzungsmodus-focus");
  });

  it("auto-selects first topic on fresh focus entry with ready timer", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-context-line")).toHaveTextContent("Traktandum 1 von 2");
    expect(screen.getByTestId("meeting-sitzungsmodus-countdown")).toHaveTextContent("05:00");
    expect(screen.getByTestId("meeting-sitzungsmodus-timer-caption")).toHaveTextContent("Geplante Dauer · 5 Min.");
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("ready");
    expect(screen.queryByTestId("meeting-sitzungsmodus-topic-select")).toBeNull();
  });

  it("shows meeting title in focus header", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle="Vereinsleitungssitzung · November 2026"
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    const title = screen.getByTestId("meeting-sitzungsmodus-focus-meeting-title");
    expect(title).toHaveTextContent("Vereinsleitungssitzung · November 2026");
    expect(title.tagName).toBe("H1");
  });

  it("renders tenant crest fallback and club typography without hardcoded asset", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="Testverein Musterstadt"
          clubLogoUrl={null}
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-focus-tenant-identity")).toBeInTheDocument();
    expect(screen.getAllByTestId("tenant-header-crest").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("tenant-logo-header-initials")[0]).toHaveTextContent("TM");
    expect(screen.queryByTestId("tenant-logo-image")).toBeNull();
  });

  it("shows Protokollnotizen heading and omits duplicate capture heading in focus", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-focus-notes-section-title")).toHaveTextContent(
      "Protokollnotizen",
    );
    expect(screen.queryByText("Was halten wir fest?")).toBeNull();
  });

  it("enters focus layout and exits to overview without ending mode", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <MeetingSitzungsmodusFocusChromeProxy />
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );

    expect(screen.queryByTestId("meeting-sitzungsmodus-focus-root")).toBeNull();
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-focus-root")).toBeInTheDocument();
    expect(document.documentElement.hasAttribute("data-meeting-sitzungsmodus-focus")).toBe(true);

    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-exit-focus"));
    expect(screen.queryByTestId("meeting-sitzungsmodus-focus-root")).toBeNull();
    expect(document.documentElement.hasAttribute("data-meeting-sitzungsmodus-focus")).toBe(false);
  });

  it("renders all agenda items in sidebar", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-agenda-item-ag-1")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-sitzungsmodus-agenda-item-ag-2")).toBeInTheDocument();
  });

  it("preserves restored topic selection over default pick", () => {
    let state = startSitzungsmodus(createMeetingAgendaTimerState(SCOPE));
    state = selectAgendaTopic(state, "ag-2", Date.now(), 15);
    const budget = resolveAgendaBudgetSec({ plannedDurationMin: 15 });
    if (budget) state = startAgendaTimer(state, Date.now(), budget);
    saveMeetingAgendaTimerState(state);

    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-context-line")).toHaveTextContent("Traktandum 2 von 2");
    expect(screen.getByTestId("meeting-sitzungsmodus-lifecycle")).toHaveTextContent("running");
  });

  it("does not pin topic heading with sticky positioning", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    const heading = screen.getByTestId("meeting-sitzungsmodus-topic-heading");
    expect(heading.className).not.toMatch(/sticky/);
    expect(heading).toHaveClass("sce-sitzungsmodus-topic-heading");
  });

  it("scrolls topic heading only on explicit agenda selection", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    const callsAfterEntry = scrollIntoView.mock.calls.length;
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-agenda-item-ag-2"));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(callsAfterEntry);
  });

  it("compact header groups crest beside meeting meta", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle="Vereinsleitungssitzung"
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    const identity = screen.getByTestId("meeting-sitzungsmodus-focus-tenant-identity");
    expect(identity.querySelector("h1")).toHaveTextContent("Vereinsleitungssitzung");
    expect(screen.getByTestId("meeting-sitzungsmodus-exit-focus")).toBeInTheDocument();
  });

  it("selecting a sidebar topic does not require completion", () => {
    render(
      <MeetingAgendaTimerProvider
        scope={SCOPE}
        canManage
        agendaItems={agendaItems}
        displayOrder={displayOrder}
      >
        <StartFocusHarness />
        <MeetingSitzungsmodusFocusExperience
          clubName="FC ALLSCHWIL"
          meeting={meeting}
          meetingSlug={meeting.slug}
          meetingTitle={meeting.title}
          fmtCfg={fmtCfg}
          participantCount={6}
          agendaItems={agendaItems}
          decisions={[]}
          actions={[]}
          canManage
        />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-agenda-item-ag-2"));
    expect(screen.getByTestId("meeting-sitzungsmodus-context-line")).toHaveTextContent("Traktandum 2 von 2");
  });
});

function MeetingSitzungsmodusFocusChromeProxy() {
  const timer = useMeetingAgendaTimer();
  const active = Boolean(timer?.focusPresentationActive && timer.state.modeActive);
  if (typeof document !== "undefined") {
    if (active) document.documentElement.setAttribute("data-meeting-sitzungsmodus-focus", "");
    else document.documentElement.removeAttribute("data-meeting-sitzungsmodus-focus");
  }
  return null;
}