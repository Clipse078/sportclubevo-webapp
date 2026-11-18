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