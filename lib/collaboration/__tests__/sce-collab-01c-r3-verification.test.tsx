/**
 * SCE-COLLAB-01C-R3 — Tournamentcenter parity, audience refresh lifecycle, header actions.
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
import VeranstaltungEditTopSaveButton from "@/components/admin/veranstaltungen/VeranstaltungEditTopSaveButton";
import VeranstaltungEditTopCancelButton from "@/components/admin/veranstaltungen/VeranstaltungEditTopCancelButton";
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import { VeranstaltungEditSubmitProvider } from "@/components/admin/veranstaltungen/VeranstaltungEditSubmitContext";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeSet } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  classifyClubEventParticipationAudience,
  resolveClubEventCommunicationPathFromEntries,
} from "@/lib/collaboration/club-event/club-event-audience-presentation";
import { resolveClubEventCollaborationImpactAfterChange } from "@/lib/collaboration/club-event/club-event-collaboration-impact-service";
import { clubEventSnapshotToCycleBaseline } from "@/lib/collaboration/activity-change/cycle-baseline";

const ROOT = join(process.cwd());

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

const mocks = vi.hoisted(() => ({
  listClubEventAudienceEntries: vi.fn(),
  resolveClubEventAudienceContext: vi.fn(),
  resolveClubEventAudiencePreview: vi.fn(),
  fetchMock: vi.fn(),
  pushMock: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.pushMock, refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-facility-availability", () => ({
  useFacilityAvailability: () => ({
    pitchAvailability: {},
    dressingRoomAvailability: {},
  }),
}));

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

describe("SCE-COLLAB-01C-R3 shared Tournamentcenter seam", () => {
  it("R3-01/R3-02/R3-03 club event uses same shared impact/composer path as tournament layout", () => {
    const tournamentLayout = read("app/(admin)/dashboard/tournamentcenter/[tournamentId]/layout.tsx");
    const clubLayout = read("app/(admin)/dashboard/veranstaltungen/[eventId]/layout.tsx");
    const clubHost = read("components/admin/collaboration/EventActivityCollaborationHost.tsx");

    expect(tournamentLayout).toContain("EventActivityCollaborationHost");
    expect(tournamentLayout).toContain('domain="TOURNAMENT"');
    expect(tournamentLayout).not.toContain("suppressImpactSlot");

    expect(clubLayout).toContain("EventActivityCollaborationHost");
    expect(clubLayout).toContain('domain="CLUB_EVENT"');
    expect(clubLayout).not.toContain("suppressImpactSlot");

    expect(clubHost).toContain("ContextualActivityChangeImpactSurface");
    expect(read("components/admin/collaboration/ContextualActivityChangeImpactSurface.tsx")).toContain(
      "ContextualActivityCommunicationComposer",
    );
  });

  it("R3-14 impact surface uses shared visual container classes", () => {
    const surface = read("components/admin/collaboration/ContextualActivityChangeImpactSurface.tsx");
    expect(surface).toContain("rounded-lg border border-[var(--border)] bg-[var(--surface-2)]");
    expect(surface).toContain('data-testid="contextual-activity-change-impact"');
  });
});

describe("SCE-COLLAB-01C-R3 audience lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R3-04/R3-05 no audience shows explanation and configure action", async () => {
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
    expect(screen.getByTestId("contextual-activity-change-audience")).toHaveTextContent(
      "Keine Zielgruppe festgelegt",
    );
    const trigger = screen.getByTestId("contextual-activity-change-configure-audience");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveTextContent("Zielgruppe festlegen");
  });

  it("R3-08 audience configuration is not part of activity change set", () => {
    const changeSet = buildClubEventActivityChangeSet(clubSnap(), clubSnap({ startTime: "20:30" }));
    const fields = changeSet.entries.map((e) => e.field);
    expect(fields).toContain("START_TIME");
    expect(fields.some((f) => String(f).includes("AUDIENCE"))).toBe(false);
  });

  it("R3-09/R3-10/R3-11 none to valid audience refreshes preview and canCommunicate", async () => {
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

    expect(impact?.canCommunicate).toBe(true);
    expect(impact?.audience?.teamNamesLabel).toBe("Vorstand");
    expect(impact?.audience?.effectiveRecipientCount).toBe(0);
    renderImpact(impact!);
    expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
  });

  it("R3-07/R3-10 audience save applies refreshed collaboration without losing cycle", async () => {
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

    function SeedCycleAndEditor() {
      const { setImpact, setCycleBaseline } = useActivityChangeCollaboration();
      useEffect(() => {
        setCycleBaseline("CLUB_EVENT", "evt-gv", baseline);
        if (initialImpact) setImpact(initialImpact);
      }, [setCycleBaseline, setImpact]);
      return <ClubEventParticipationAudienceEditor eventId="evt-gv" />;
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
                effectiveRecipientCount: 2,
                zeroRecipients: false,
                recipientPreviewLabel: "Vorstand · 2 Empfänger",
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
          <SeedCycleAndEditor />
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("club-event-audience-team-select")).toBeInTheDocument());
    fireEvent.change(screen.getByTestId("club-event-audience-team-select"), {
      target: { value: "team-1" },
    });
    fireEvent.click(screen.getByTestId("club-event-audience-team-add"));

    await waitFor(() => {
      expect(mocks.fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/participation-audience"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("collaborationCycleBaseline"),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("contextual-activity-change-impact")).toHaveTextContent("20:30");
      expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
    });
  });
});

describe("SCE-COLLAB-01C-R3 authorization paths", () => {
  it("R3-19 team-only audience uses TEAM path", () => {
    const path = resolveClubEventCommunicationPathFromEntries([
      { id: "1", kind: "TEAM", referenceId: "team-1", label: "Junioren F2" },
    ]);
    expect(path).toBe("TEAM");
  });

  it("R3-20/R3-21/R3-22/R3-23 non-team-only uses CLUB path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "ROLE", referenceId: "r1", label: "Vorstand" },
      ]),
    ).toBe("CLUB");
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "ORG_UNIT", referenceId: "ou1", label: "Junioren" },
      ]),
    ).toBe("CLUB");
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "PERSON", referenceId: "p1", label: "Max Muster" },
      ]),
    ).toBe("CLUB");
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "TEAM", referenceId: "t1", label: "F2" },
        { id: "2", kind: "ROLE", referenceId: "r1", label: "Vorstand" },
      ]),
    ).toBe("CLUB");
  });

  it("R3-04 classification NONE for empty entries", () => {
    expect(classifyClubEventParticipationAudience([]).state).toBe("NONE");
  });
});

describe("SCE-COLLAB-01C-R3 header actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ event: {}, collaboration: null }),
    });
    global.fetch = mocks.fetchMock as typeof fetch;
  });

  const baseEvent = {
    id: "evt-gv",
    title: "Mitgliederversammlung",
    description: null,
    location: "Clubhaus",
    startAt: "2026-11-12T19:00:00.000Z",
    endAt: "2026-11-12T20:00:00.000Z",
    allDay: false,
    organizerName: null,
    remarks: null,
    status: "SCHEDULED",
    source: "MANUAL",
    websiteVisible: true,
    infoboardVisible: false,
    homepageVisible: false,
    wochenplanVisible: false,
    trainingsplanVisible: false,
    teamPageVisible: false,
    season: { id: "season-1", key: "2026-27", name: "2026/27" },
  };

  it("R3-25/R3-26/R3-27/R3-28/R3-29 header save/cancel; no bottom actions", () => {
    render(
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv">
          <VeranstaltungEditSubmitProvider>
            <VeranstaltungEditTopSaveButton />
            <VeranstaltungEditTopCancelButton />
            <VeranstaltungEditForm event={baseEvent} timeZone="Europe/Zurich" canManage />
          </VeranstaltungEditSubmitProvider>
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    expect(screen.getByTestId("veranstaltung-edit-save-top")).toBeInTheDocument();
    expect(screen.getByTestId("veranstaltung-edit-cancel-top")).toBeInTheDocument();
    expect(screen.queryByTestId("veranstaltung-edit-save")).toBeNull();
    expect(screen.queryByTestId("veranstaltung-edit-cancel")).toBeNull();
    expect(screen.queryByTestId("veranstaltung-edit-actions")).toBeNull();
  });

  it("R3-26 top cancel navigates back to list", () => {
    render(
      <IntlWrapper>
        <VeranstaltungEditTopCancelButton />
      </IntlWrapper>,
    );
    fireEvent.click(screen.getByTestId("veranstaltung-edit-cancel-top"));
    expect(mocks.pushMock).toHaveBeenCalledWith("/dashboard/veranstaltungen");
  });

  it("R3-30 header action cluster uses planning editor flex wrap layout", () => {
    const header = read("components/admin/shared/planning-editor/PlanningEditorHeader.tsx");
    expect(header).toContain("flex flex-wrap items-center gap-2");
  });
});

describe("SCE-COLLAB-01C-R3 composer parity", () => {
  it("R3-16 composer component accepts club event domain", () => {
    const composer = read("components/admin/collaboration/ContextualActivityCommunicationComposer.tsx");
    expect(composer).toContain('domain: ActivityCollaborationDomain');
    expect(composer).toContain("canDispatch");
  });
});
