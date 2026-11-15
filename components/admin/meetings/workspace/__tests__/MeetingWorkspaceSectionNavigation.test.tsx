// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vereinsleitung/meetings/demo-meeting",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

import MeetingWorkspaceCollapsibleSection from "@/components/admin/meetings/workspace/MeetingWorkspaceCollapsibleSection";
import MeetingWorkspaceSectionNav from "@/components/admin/meetings/workspace/MeetingWorkspaceSectionNav";
import { MeetingParticipantsSection } from "@/components/admin/meetings/workspace/MeetingWorkspaceSections";
import {
  MeetingWorkspaceDirtyShell,
  MeetingWorkspaceDirtyStateSync,
} from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";

const counts = {
  traktanden: 1,
  beschluesse: 0,
  pendenzenOpen: 0,
  teilnehmer: 0,
};

function DraftableTraktanden() {
  const [title, setTitle] = useState("Traktanden-Entwurf");
  return (
    <input
      data-testid="meeting-agenda-draft"
      value={title}
      aria-label="Traktandum"
      onChange={(event) => setTitle(event.target.value)}
    />
  );
}

type HarnessProps = {
  isDirty?: boolean;
  canManageParticipants?: boolean;
};

function SectionNavigationHarness({ isDirty = false, canManageParticipants = true }: HarnessProps) {
  return (
    <MeetingWorkspaceDirtyShell>
      <MeetingWorkspaceDirtyStateSync isDirty={isDirty} />
      <MeetingWorkspaceSectionNav counts={counts}>
        <MeetingWorkspaceCollapsibleSection sectionId="traktanden" title="Traktanden (1)">
          <DraftableTraktanden />
        </MeetingWorkspaceCollapsibleSection>
        <MeetingWorkspaceCollapsibleSection sectionId="beschluesse" title="Beschlüsse (0)">
          <div data-testid="beschluesse-content">Beschlüsse-Inhalt</div>
        </MeetingWorkspaceCollapsibleSection>
        <MeetingWorkspaceCollapsibleSection sectionId="pendenzen" title="Pendenzen (0)" lazy>
          <div data-testid="pendenzen-lazy-content">Pendenzen geladen</div>
        </MeetingWorkspaceCollapsibleSection>
        <MeetingWorkspaceCollapsibleSection sectionId="teilnehmer" title="Teilnehmer (0)">
          <MeetingParticipantsSection
            meetingId="m-1"
            canManage={canManageParticipants}
            items={[]}
            onItemsChange={vi.fn()}
          />
        </MeetingWorkspaceCollapsibleSection>
      </MeetingWorkspaceSectionNav>
    </MeetingWorkspaceDirtyShell>
  );
}

describe("Meeting workspace section navigation (runtime)", () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    window.history.replaceState(null, "", "/vereinsleitung/meetings/demo-meeting");
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${originalHash}`);
  });

  it("expands a section on toggle click", () => {
    render(<SectionNavigationHarness />);
    const section = screen.getByTestId("meeting-workspace-section-beschluesse");
    expect(section).toHaveAttribute("data-expanded", "false");

    fireEvent.click(screen.getByTestId("meeting-workspace-section-toggle-beschluesse"));
    expect(section).toHaveAttribute("data-expanded", "true");
    expect(screen.getByTestId("beschluesse-content")).toBeVisible();
  });

  it("keeps multiple sections open", () => {
    render(<SectionNavigationHarness />);
    expect(screen.getByTestId("meeting-workspace-section-traktanden")).toHaveAttribute(
      "data-expanded",
      "true",
    );

    fireEvent.click(screen.getByTestId("meeting-workspace-tab-beschluesse"));
    expect(screen.getByTestId("meeting-workspace-section-traktanden")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    expect(screen.getByTestId("meeting-workspace-section-beschluesse")).toHaveAttribute(
      "data-expanded",
      "true",
    );
  });

  it("retains draft input when collapsing without discard prompt", () => {
    render(<SectionNavigationHarness isDirty />);
    const input = screen.getByTestId("meeting-agenda-draft");
    fireEvent.change(input, { target: { value: "Geändertes Traktandum" } });

    fireEvent.click(screen.getByTestId("meeting-workspace-section-toggle-traktanden"));
    expect(screen.getByTestId("meeting-workspace-section-traktanden")).toHaveAttribute(
      "data-expanded",
      "false",
    );
    expect(screen.queryByRole("heading", { name: "Ungespeicherte Änderungen" })).not.toBeInTheDocument();
    expect(input).toHaveValue("Geändertes Traktandum");
  });

  it("lazy-loads Pendenzen body on first expansion", () => {
    render(<SectionNavigationHarness />);
    expect(screen.queryByTestId("pendenzen-lazy-content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("meeting-workspace-tab-pendenzen"));
    expect(screen.getByTestId("pendenzen-lazy-content")).toBeInTheDocument();
  });

  it("opens section from hash deep link", () => {
    window.history.replaceState(
      null,
      "",
      "/vereinsleitung/meetings/demo-meeting#meeting-workspace-section-pendenzen",
    );
    render(<SectionNavigationHarness />);
    expect(screen.getByTestId("meeting-workspace-section-pendenzen")).toHaveAttribute(
      "data-expanded",
      "true",
    );
    expect(screen.getByTestId("pendenzen-lazy-content")).toBeInTheDocument();
  });

  it("reacts to Back/Forward hash changes", () => {
    render(<SectionNavigationHarness />);
    fireEvent.click(screen.getByTestId("meeting-workspace-tab-beschluesse"));
    expect(screen.getByTestId("meeting-workspace-section-beschluesse")).toHaveAttribute(
      "data-expanded",
      "true",
    );

    window.history.pushState(
      null,
      "",
      "/vereinsleitung/meetings/demo-meeting#meeting-workspace-section-traktanden",
    );
    fireEvent(window, new HashChangeEvent("hashchange"));

    const traktanden = screen.getByTestId("meeting-workspace-section-traktanden");
    expect(traktanden).toHaveAttribute("data-expanded", "true");
    const nav = screen.getByTestId("meeting-workspace-section-nav");
    expect(within(nav).getByTestId("meeting-workspace-tab-traktanden")).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("hides participant create controls when canManage is false", () => {
    render(<SectionNavigationHarness canManageParticipants={false} />);
    fireEvent.click(screen.getByTestId("meeting-workspace-section-toggle-teilnehmer"));
    expect(screen.queryByTestId("meeting-participants-add-toggle")).not.toBeInTheDocument();
  });
});