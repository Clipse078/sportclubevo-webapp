/**
 * SCE-COLLAB-01C-R4 — contextual audience dialog (no page jump).
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useEffect, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";
import {
  ActivityChangeCollaborationProvider,
  useActivityChangeCollaboration,
} from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import ClubEventParticipationAudienceEditor from "@/components/admin/veranstaltungen/ClubEventParticipationAudienceEditor";
import {
  clubEventParticipationAudienceKindLabelDe,
  formatClubEventParticipationAudienceEntryLabel,
} from "@/lib/collaboration/club-event/club-event-audience-presentation";
import { buildClubEventActivityChangeSet } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { resolveClubEventCollaborationImpactAfterChange } from "@/lib/collaboration/club-event/club-event-collaboration-impact-service";
import { clubEventSnapshotToCycleBaseline } from "@/lib/collaboration/activity-change/cycle-baseline";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";

const ROOT = join(process.cwd());

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

const mocks = vi.hoisted(() => ({
  listClubEventAudienceEntries: vi.fn(),
  resolveClubEventAudienceContext: vi.fn(),
  resolveClubEventAudiencePreview: vi.fn(),
  fetchMock: vi.fn(),
  scrollIntoViewMock: vi.fn(),
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  listClubEventAudienceEntries: (...args: unknown[]) => mocks.listClubEventAudienceEntries(...args),
}));

vi.mock("@/lib/collaboration/club-event/resolve-club-event-audience", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/collaboration/club-event/resolve-club-event-audience")
  >();
  return {
    ...actual,
    resolveClubEventAudienceContext: (...args: unknown[]) =>
      mocks.resolveClubEventAudienceContext(...args),
  };
});

vi.mock("@/lib/collaboration/club-event/resolve-club-event-audience-preview", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/collaboration/club-event/resolve-club-event-audience-preview")
  >();
  return {
    ...actual,
    resolveClubEventAudiencePreview: (...args: unknown[]) =>
      mocks.resolveClubEventAudiencePreview(...args),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn(), neutral: vi.fn() },
  }),
}));

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

function clubSnap(overrides: Partial<ClubEventActivitySnapshot> = {}): ClubEventActivitySnapshot {
  return {
    eventId: "evt-gv",
    tenantId: "tenant-1",
    teamId: null,
    teamSeasonId: null,
    title: "Mitgliederversammlung",
    status: "SCHEDULED",
    allDay: false,
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-11-12",
    startTime: "20:00",
    endTime: "21:00",
    locationLabel: "Clubhaus",
    resourceLabel: null,
    playableVenueLabel: null,
    scheduleLine: null,
    ...overrides,
  };
}

function renderImpact(impact: ActivityChangeImpact) {
  return render(
    <IntlWrapper>
      <ActivityChangeCollaborationProvider>
        <ContextualActivityChangeImpactSurface
          domain="CLUB_EVENT"
          activityId="evt-gv"
          impact={impact}
          onDismiss={vi.fn()}
        />
      </ActivityChangeCollaborationProvider>
    </IntlWrapper>,
  );
}

describe("SCE-COLLAB-01C-R4 contextual audience UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scrollIntoViewMock.mockReset();
    Element.prototype.scrollIntoView = mocks.scrollIntoViewMock;
    mocks.fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/participation-audience") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            entries: [{ id: "e1", kind: "ROLE", label: "Vorstand", referenceId: "role-1" }],
            collaboration: {
              canCommunicate: true,
              audience: {
                teamNamesLabel: "Vorstand",
                teamName: "Vorstand",
                effectiveRecipientCount: 0,
                audienceNotConfigured: false,
              },
            },
          }),
        };
      }
      if (url.includes("/participation-audience")) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      if (url.includes("/api/teams")) {
        return { ok: true, json: async () => ({ teams: [{ id: "team-1", name: "Junioren F2" }] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.fetch = mocks.fetchMock as typeof fetch;
  });

  it("R4-01 configure action is not anchor/hash navigation", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    const trigger = screen.getByTestId("contextual-activity-change-configure-audience");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).not.toHaveAttribute("href");
    expect(read("components/admin/collaboration/ContextualActivityChangeImpactSurface.tsx")).not.toContain(
      "#veranstaltung-edit-participants-heading",
    );
  });

  it("R4-02 click opens contextual audience dialog", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Wähle aus, wer von dieser Veranstaltung betroffen ist.")).toBeInTheDocument();
  });

  it("R4-03 dialog reuses canonical audience editor core", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    await waitFor(() =>
      expect(screen.getByTestId("club-event-participation-audience-editor-core")).toBeInTheDocument(),
    );
    expect(read("components/admin/collaboration/ContextualClubEventParticipationAudienceDialog.tsx")).toContain(
      "ClubEventParticipationAudienceEditorCore",
    );
  });

  it("R4-04 Teilnehmer page editor wrapper preserved", () => {
    const page = read("app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx");
    expect(page).toContain("ClubEventParticipationAudienceEditor");
    expect(page).toContain("veranstaltung-edit-participants-heading");
  });

  it("R4-05 audience types use human-readable labels", () => {
    expect(clubEventParticipationAudienceKindLabelDe("TEAM")).toBe("Team");
    expect(clubEventParticipationAudienceKindLabelDe("ORG_UNIT")).toBe("Organisationseinheit");
    expect(clubEventParticipationAudienceKindLabelDe("ROLE")).toBe("Rolle");
    expect(clubEventParticipationAudienceKindLabelDe("PERSON")).toBe("Person");
    expect(formatClubEventParticipationAudienceEntryLabel({ kind: "ROLE", label: "Vorstand" })).toBe(
      "Rolle: Vorstand",
    );
  });

  it("R4-06/R4-11 save uses participation-audience API and closes dialog", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    await waitFor(() => screen.getByTestId("club-event-audience-team-select"));
    fireEvent.change(screen.getByTestId("club-event-audience-team-select"), {
      target: { value: "team-1" },
    });
    fireEvent.click(screen.getByTestId("contextual-club-event-audience-save"));

    await waitFor(() => {
      expect(mocks.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/participation-audience"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("R4-07 cancel does not POST audience mutation", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    await waitFor(() => screen.getByTestId("club-event-audience-team-select"));
    fireEvent.change(screen.getByTestId("club-event-audience-team-select"), {
      target: { value: "team-1" },
    });
    const postCallsBefore = mocks.fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const postCallsAfter = mocks.fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").length;
    expect(postCallsAfter).toBe(postCallsBefore);
  });

  it("R4-10 audience configuration is not part of activity change set", () => {
    const changeSet = buildClubEventActivityChangeSet(clubSnap(), clubSnap({ startTime: "20:30" }));
    expect(changeSet.entries.some((e) => String(e.field).includes("AUDIENCE"))).toBe(false);
  });

  it("R4-21 opening/closing dialog does not scroll page", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(mocks.scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("R4-22/R4-23 header actions regression via edit page imports", () => {
    const page = read("app/(admin)/dashboard/veranstaltungen/[eventId]/edit/page.tsx");
    expect(page).toContain("VeranstaltungEditTopSaveButton");
    expect(page).toContain("VeranstaltungEditTopCancelButton");
    expect(page).not.toContain('testId="veranstaltung-edit-save"');
  });

  it("R4-24 tournament shared impact surface unchanged", () => {
    const tournamentLayout = read("app/(admin)/dashboard/tournamentcenter/[tournamentId]/layout.tsx");
    expect(tournamentLayout).toContain("EventActivityCollaborationHost");
    expect(read("components/admin/collaboration/ContextualActivityChangeImpactSurface.tsx")).toContain(
      "ContextualActivityCommunicationComposer",
    );
  });
});

describe("SCE-COLLAB-01C-R4 audience refresh lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R4-08/R4-09 cancel/save preserve unresolved cycle via collaboration host", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const before = clubSnap();
    const after = clubSnap({ startTime: "20:30" });
    const baseline = clubEventSnapshotToCycleBaseline(before);
    const initialImpact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before,
      after,
    });

    function SeedCycle() {
      const { setImpact, setCycleBaseline } = useActivityChangeCollaboration();
      useEffect(() => {
        setCycleBaseline("CLUB_EVENT", "evt-gv", baseline);
        if (initialImpact) setImpact(initialImpact);
      }, [setCycleBaseline, setImpact]);
      return null;
    }

    mocks.fetchMock.mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/participation-audience") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            entries: [{ id: "e1", kind: "ROLE", label: "Vorstand", referenceId: "role-1" }],
            collaboration: {
              ...initialImpact,
              canCommunicate: true,
              audience: {
                teamId: "evt-gv",
                teamNamesLabel: "Vorstand",
                teamName: "Vorstand",
                effectiveRecipientCount: 0,
                zeroRecipients: true,
                audienceNotConfigured: false,
              },
            },
            collaborationCycleBaseline: baseline,
          }),
        };
      }
      if (url.includes("/participation-audience")) {
        return { ok: true, json: async () => ({ entries: [] }) };
      }
      if (url.includes("/api/teams")) {
        return { ok: true, json: async () => ({ teams: [{ id: "team-1", name: "Junioren F2" }] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.fetch = mocks.fetchMock as typeof fetch;

    render(
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv">
          <SeedCycle />
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    expect(screen.getByTestId("contextual-activity-change-impact")).toHaveTextContent("20:30");
    fireEvent.click(screen.getByTestId("contextual-activity-change-configure-audience"));
    await waitFor(() => screen.getByTestId("club-event-audience-team-select"));
    fireEvent.change(screen.getByTestId("club-event-audience-team-select"), {
      target: { value: "team-1" },
    });
    fireEvent.click(screen.getByTestId("contextual-club-event-audience-save"));

    await waitFor(() => {
      expect(screen.getByTestId("contextual-activity-change-impact")).toHaveTextContent("20:30");
      expect(screen.getByTestId("contextual-activity-change-audience")).toHaveTextContent("Vorstand");
      expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
    });
  });

  it("R4-16/R4-17 zero recipients still shows communicate action", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([
      { id: "e1", kind: "ROLE", referenceId: "role-vorstand", label: "Vorstand" },
    ]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue({
      audienceLabel: "Vorstand",
      teamNamesLabel: "Vorstand",
      teamName: "Vorstand",
      communicationPath: "CLUB",
      primaryTeamId: null,
      audienceSpec: { kind: "ROLE", roleId: "role-vorstand" },
    });
    mocks.resolveClubEventAudiencePreview.mockResolvedValue({
      canCommunicate: true,
      communicationScope: "CLUB",
      audience: {
        teamId: "evt-gv",
        teamName: "Vorstand",
        teamNamesLabel: "Vorstand",
        effectiveRecipientCount: 0,
        zeroRecipients: true,
        recipientPreviewLabel: "Vorstand",
      },
    });

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    renderImpact(impact!);
    expect(screen.getByTestId("contextual-activity-change-recipient-count")).toHaveTextContent("0");
    expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
  });

  it("R4-04 inline editor still available on page", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [] }),
    });
    global.fetch = mocks.fetchMock as typeof fetch;

    render(
      <IntlWrapper>
        <ActivityChangeCollaborationProvider>
          <ClubEventParticipationAudienceEditor eventId="evt-gv" />
        </ActivityChangeCollaborationProvider>
      </IntlWrapper>,
    );
    await waitFor(() => expect(screen.getByTestId("club-event-audience-team-add")).toBeInTheDocument());
  });
});
