// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MeetingAgendaTimerProvider,
  useMeetingAgendaTimer,
} from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MeetingWorkspaceSitzungsmodusShell } from "@/components/admin/meetings/workspace/MeetingWorkspaceSitzungsmodusShell";
import { MeetingSitzungsmodusFocusChrome } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusFocusChrome";
import { saveMeetingSitzungsmodusFocusPresentation } from "@/lib/meetings/sitzungsmodus/meeting-sitzungsmodus-focus-presentation";
import { createMeetingAgendaTimerState, startSitzungsmodus } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";
import { saveMeetingAgendaTimerState } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

const SCOPE = { meetingId: "m-nov", tenantId: "t1", userId: "u1" };

const agendaItems = [
  {
    id: "ag-1",
    title: "Begrüssung",
    durationMin: 5,
    owner: null,
    ownerPersonId: null,
    initiativeId: null,
    notes: "",
    orderIndex: 1,
    status: "OPEN" as const,
    sourceAgendaItemId: null,
    initiative: null,
  },
] satisfies MeetingSubEntities["agendaItems"];

const meeting = {
  id: "m-nov",
  title: "Vereinsleitungssitzung",
  slug: "vereinsleitungssitzung-november-2026",
  meetingDate: new Date("2026-11-15T18:30:00Z"),
  plannedDurationMin: 90,
} as MeetingLiveData;

const fmtCfg: TenantFormatConfig = { locale: "de-CH", timezone: "Europe/Zurich" };
const displayOrder = new Map([["ag-1", 1]]);

function MeetingDetailFixture() {
  return (
    <div data-meeting-detail-outer-chrome>
      <div data-sce-workspace-chrome data-testid="sce-workspace-chrome">
        <nav data-testid="detail-breadcrumbs">Breadcrumbs</nav>
        <header data-testid="detail-header">Header</header>
        <main id="sce-workspace-main" data-sce-page-shell>
          <MeetingWorkspaceSitzungsmodusShell
            canManage
            focusProps={{
              clubName: "FC Test",
              meeting,
              meetingSlug: meeting.slug,
              meetingTitle: meeting.title,
              fmtCfg,
              participantCount: 1,
              agendaItems,
              decisions: [],
              actions: [],
            }}
          >
            <motionSafe data-testid="ordinary-meeting-detail">Ordinary detail body</motionSafe>
          </MeetingWorkspaceSitzungsmodusShell>
        </main>
      </div>
    </div>
  );
}

function StartFocus() {
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

describe("Sitzungsmodus focus mount regression (layout composition)", () => {
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
    document.documentElement.removeAttribute("data-meeting-sitzungsmodus-focus");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-meeting-sitzungsmodus-focus");
  });

  it("shows ordinary meeting detail when focus is inactive", () => {
    render(
      <MeetingAgendaTimerProvider scope={SCOPE} canManage agendaItems={agendaItems} displayOrder={displayOrder}>
        <MeetingSitzungsmodusFocusChrome />
        <MeetingDetailFixture />
      </MeetingAgendaTimerProvider>,
    );
    expect(screen.getByTestId("ordinary-meeting-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-sitzungsmodus-focus-root")).toBeNull();
  });

  it("replaces ordinary detail with focus workspace inside main landmark", () => {
    render(
      <MeetingAgendaTimerProvider scope={SCOPE} canManage agendaItems={agendaItems} displayOrder={displayOrder}>
        <MeetingSitzungsmodusFocusChrome />
        <StartFocus />
        <MeetingDetailFixture />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(screen.getByTestId("meeting-sitzungsmodus-focus-root")).toBeInTheDocument();
    expect(screen.queryByTestId("ordinary-meeting-detail")).toBeNull();
    expect(screen.getByTestId("sce-workspace-chrome").querySelector("main")).toContainElement(
      screen.getByTestId("meeting-sitzungsmodus-focus-root"),
    );
  });

  it("restores ordinary detail after exit without unmounting meeting route", () => {
    render(
      <MeetingAgendaTimerProvider scope={SCOPE} canManage agendaItems={agendaItems} displayOrder={displayOrder}>
        <MeetingSitzungsmodusFocusChrome />
        <StartFocus />
        <MeetingDetailFixture />
      </MeetingAgendaTimerProvider>,
    );
    fireEvent.click(screen.getByTestId("start-focus"));
    fireEvent.click(screen.getByTestId("meeting-sitzungsmodus-exit-focus"));
    expect(screen.getByTestId("ordinary-meeting-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-sitzungsmodus-focus-root")).toBeNull();
    expect(document.documentElement.hasAttribute("data-meeting-sitzungsmodus-focus")).toBe(false);
  });

  it("restores persisted focus presentation into visible focus workspace", () => {
    saveMeetingAgendaTimerState({ ...startSitzungsmodus(createMeetingAgendaTimerState(SCOPE)) });
    saveMeetingSitzungsmodusFocusPresentation(SCOPE, true);

    render(
      <MeetingAgendaTimerProvider scope={SCOPE} canManage agendaItems={agendaItems} displayOrder={displayOrder}>
        <MeetingSitzungsmodusFocusChrome />
        <MeetingDetailFixture />
      </MeetingAgendaTimerProvider>,
    );
    expect(screen.getByTestId("meeting-sitzungsmodus-focus-root")).toBeInTheDocument();
  });
});

function MotionSafe({
  children,
  ...rest
}: { children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-reduced-motion-safe="true" {...rest}>
      {children}
    </div>
  );
}