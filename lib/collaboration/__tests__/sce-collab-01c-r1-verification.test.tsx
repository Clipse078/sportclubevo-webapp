/**
 * SCE-COLLAB-01C-R1 — Human UAT defect regression (club event edit impact surface + top save).
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import {
  ActivityChangeCollaborationProvider,
  useActivityChangeCollaboration,
} from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { useCollaborationMutation } from "@/lib/collaboration/client/use-collaboration-mutation";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeSet } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { buildClubEventMutationCollaborationImpact } from "@/lib/collaboration/club-event/club-event-mutation-collaboration";
import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import { resolveClubEventCollaborationImpactAfterChange } from "@/lib/collaboration/club-event/club-event-collaboration-impact-service";
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import { VeranstaltungEditSubmitProvider } from "@/components/admin/veranstaltungen/VeranstaltungEditSubmitContext";
import VeranstaltungEditTopSaveButton from "@/components/admin/veranstaltungen/VeranstaltungEditTopSaveButton";
import { VERANSTALTUNG_EDIT_FORM_ID } from "@/components/admin/veranstaltungen/veranstaltung-edit-form-id";

const mocks = vi.hoisted(() => ({
  loadClubEventActivitySnapshot: vi.fn(),
  listClubEventAudienceEntries: vi.fn(),
  resolveClubEventAudienceContext: vi.fn(),
  resolveClubEventAudiencePreview: vi.fn(),
  resolveClubEventCommunicationScope: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveClubCommunicationAuthorization: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("@/lib/collaboration/club-event/club-event-activity-snapshot", () => ({
  loadClubEventActivitySnapshot: mocks.loadClubEventActivitySnapshot,
}));

vi.mock("@/lib/events/club-event-participation-audience-service", () => ({
  listClubEventAudienceEntries: (...args: unknown[]) => mocks.listClubEventAudienceEntries(...args),
}));

vi.mock("@/lib/collaboration/club-event/resolve-club-event-audience", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/collaboration/club-event/resolve-club-event-audience")>();
  return {
    ...actual,
    resolveClubEventAudienceContext: (...args: unknown[]) =>
      mocks.resolveClubEventAudienceContext(...args),
  };
});

vi.mock("@/lib/collaboration/club-event/resolve-club-event-audience-preview", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/collaboration/club-event/resolve-club-event-audience-preview")
    >();
  return {
    ...actual,
    resolveClubEventAudiencePreview: (...args: unknown[]) =>
      mocks.resolveClubEventAudiencePreview(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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
    playableVenueLabel: "Clubhaus",
    scheduleLine: "Donnerstag · 20:00–21:00",
    ...overrides,
  };
}

function worthyClubImpact(
  changeSet: NonNullable<ActivityChangeImpact["changeSet"]>,
  audience: ActivityChangeImpact["audience"],
  canCommunicate = true,
): ActivityChangeImpact {
  return {
    worthy: true,
    activityTitle: "Mitgliederversammlung",
    activityScheduleLine: clubSnap().scheduleLine,
    changeSet,
    audience,
    canCommunicate,
  };
}

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

function ApplyImpactOnMount({ impact }: { impact: ActivityChangeImpact }) {
  const { setImpact } = useActivityChangeCollaboration();
  useEffect(() => {
    setImpact(impact);
  }, [impact, setImpact]);
  return null;
}

describe("SCE-COLLAB-01C-R1 server collaboration payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveClubEventAudienceContext.mockResolvedValue({
      audienceSpec: { composition: "UNION", components: [] },
      audienceLabel: "Mitglieder",
      primaryTeamId: null,
      teamIds: [],
      teamName: "Mitglieder",
      teamNamesLabel: "Mitglieder",
      communicationPath: "CLUB",
      participationEntries: [],
    });
    mocks.resolveClubEventAudiencePreview.mockResolvedValue({
      canCommunicate: true,
      communicationScope: "CLUB",
      audience: {
        teamId: "evt-gv",
        teamName: "Mitglieder",
        teamNamesLabel: "Mitglieder",
        recipientPreviewLabel: "Mitglieder · 42 Empfänger",
        effectiveRecipientCount: 42,
        zeroRecipients: false,
      },
    });
    mocks.listClubEventAudienceEntries.mockResolvedValue([
      { id: "a1", kind: "ORG_UNIT", referenceId: "ou-members", label: "Mitglieder" },
    ]);
  });

  it("R1-01 event edit mutation returns worthy collaboration result", async () => {
    const before = clubSnap();
    const after = clubSnap({ startTime: "20:30" });
    mocks.loadClubEventActivitySnapshot.mockResolvedValue(after);

    const result = await buildClubEventMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      eventId: "evt-gv",
      beforeSnapshot: before,
      cycleBaseline: null,
    });

    const payload = buildCollaborationMutationResponse(result);
    expect(payload.collaboration?.worthy).toBe(true);
    expect(payload.collaboration?.changeSet?.entries.some((e) => e.field === "START_TIME")).toBe(
      true,
    );
    expect(payload.collaboration?.audience?.teamNamesLabel).toBe("Mitglieder");
    expect(payload.collaboration?.canCommunicate).toBe(true);
  });

  it("R1-09 second save accumulates first + second change", async () => {
    const baseline = clubSnap({ startTime: "20:00", locationLabel: "Ort folgt" });
    const after = clubSnap({ startTime: "20:30", locationLabel: "Clubhaus" });
    mocks.loadClubEventActivitySnapshot.mockResolvedValue(after);

    const result = await buildClubEventMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      eventId: "evt-gv",
      beforeSnapshot: baseline,
      cycleBaseline: {
        domain: "CLUB_EVENT",
        eventId: "evt-gv",
        dateKey: baseline.dateKey,
        startTime: "20:00",
        endTime: baseline.endTime,
        allDay: false,
        locationLabel: "Ort folgt",
        resourceLabel: null,
        status: "SCHEDULED",
      },
    });

    expect(result.impact?.changeSet?.entries.length).toBeGreaterThanOrEqual(2);
  });
});

describe("SCE-COLLAB-01C-R1 edit client impact surface", () => {
  const changeSet = buildClubEventActivityChangeSet(
    clubSnap(),
    clubSnap({ startTime: "20:30" }),
  )!;

  const impact = worthyClubImpact(changeSet, {
    teamId: "evt-gv",
    teamName: "Mitglieder",
    teamNamesLabel: "Mitglieder",
    recipientPreviewLabel: null,
    effectiveRecipientCount: 42,
    zeroRecipients: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mocks.fetchMock as typeof fetch;
  });

  it("R1-02/R1-03 client applies collaboration and renders persistent impact surface", async () => {
    render(
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv" suppressImpactSlot={false}>
          <ApplyImpactOnMount impact={impact} />
          <div data-testid="edit-surface">edit</div>
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    expect(await screen.findByTestId("contextual-activity-change-impact")).toBeInTheDocument();
  });

  it("R1-04/R1-05/R1-06/R1-07/R1-08 impact surface shows count, delta, audience, recipients, communicate", async () => {
    render(
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

    expect(screen.getByTestId("contextual-activity-change-count")).toHaveTextContent("1 Änderung");
    expect(screen.getByTestId("contextual-activity-change-single")).toHaveTextContent("20:00");
    expect(screen.getByTestId("contextual-activity-change-single")).toHaveTextContent("20:30");
    expect(screen.getByTestId("contextual-activity-change-audience")).toHaveTextContent("Mitglieder");
    expect(screen.getByTestId("contextual-activity-change-recipient-count")).toHaveTextContent("42");
    expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
  });

  it("R1-10 router.refresh simulation preserves unresolved cycle", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv">
          {children}
        </EventActivityCollaborationHost>
      </IntlWrapper>
    );

    const { result, rerender } = renderHook(() => useCollaborationMutation("CLUB_EVENT", "evt-gv"), {
      wrapper,
    });

    act(() => {
      result.current.applyMutationCollaboration(
        {
          collaboration: impact,
          collaborationCycleBaseline: {
            domain: "CLUB_EVENT",
            eventId: "evt-gv",
            dateKey: "2026-11-12",
            startTime: "20:00",
            endTime: "21:00",
            allDay: false,
            locationLabel: "Clubhaus",
            resourceLabel: null,
            status: "SCHEDULED",
          },
        },
        false,
      );
    });

    rerender();

    await waitFor(() => {
      expect(result.current.attachCycleBaseline({}).cycleRequested).toBe(true);
    });
  });

  it("R1-16 unauthorized actor gets no recipient enumeration", () => {
    const restricted = worthyClubImpact(changeSet, {
      teamId: "evt-gv",
      teamName: "Mitglieder",
      teamNamesLabel: "Mitglieder",
      recipientPreviewLabel: null,
      effectiveRecipientCount: null,
      zeroRecipients: false,
    }, false);

    render(
      <IntlWrapper>
        <ActivityChangeCollaborationProvider>
          <ContextualActivityChangeImpactSurface
            domain="CLUB_EVENT"
            activityId="evt-gv"
            impact={restricted}
            onDismiss={vi.fn()}
          />
        </ActivityChangeCollaborationProvider>
      </IntlWrapper>,
    );

    expect(screen.queryByTestId("contextual-activity-change-recipient-count")).toBeNull();
    expect(screen.queryByTestId("contextual-activity-change-communicate")).toBeNull();
  });
});

describe("SCE-COLLAB-01C-R1 save UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        event: {},
        collaboration: worthyClubImpact(
          buildClubEventActivityChangeSet(clubSnap(), clubSnap({ startTime: "20:30" }))!,
          {
            teamId: "evt-gv",
            teamName: "Mitglieder",
            teamNamesLabel: "Mitglieder",
            recipientPreviewLabel: null,
            effectiveRecipientCount: 42,
            zeroRecipients: false,
          },
        ),
      }),
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

  it("R1-17/R1-18/R1-19 top save submits canonical form with shared loading", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mocks.fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv">
          <VeranstaltungEditSubmitProvider>
            <VeranstaltungEditTopSaveButton />
            <VeranstaltungEditForm event={baseEvent} timeZone="Europe/Zurich" canManage />
          </VeranstaltungEditSubmitProvider>
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    const top = screen.getByTestId("veranstaltung-edit-save-top");
    expect(screen.queryByTestId("veranstaltung-edit-save")).toBeNull();
    expect(top).toHaveAttribute("form", VERANSTALTUNG_EDIT_FORM_ID);

    fireEvent.click(top);

    await waitFor(() => {
      expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
      expect(top).toBeDisabled();
    });

    resolveFetch({
      ok: true,
      json: async () => ({ event: {}, collaboration: null }),
    });
  });

  it("R1-20 duplicate submit guard on rapid double click", async () => {
    render(
      <IntlWrapper>
        <EventActivityCollaborationHost domain="CLUB_EVENT" activityId="evt-gv">
          <VeranstaltungEditSubmitProvider>
            <VeranstaltungEditTopSaveButton />
            <VeranstaltungEditForm event={baseEvent} timeZone="Europe/Zurich" canManage />
          </VeranstaltungEditSubmitProvider>
        </EventActivityCollaborationHost>
      </IntlWrapper>,
    );

    const top = screen.getByTestId("veranstaltung-edit-save-top");
    fireEvent.click(top);
    fireEvent.click(top);

    await waitFor(() => {
      expect(mocks.fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
    });
  });
});

describe("SCE-COLLAB-01C-R1 audience fallback label", () => {
  it("R1-06 resolves human-readable audience when participation entries exist", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([
      { id: "a1", kind: "ORG_UNIT", referenceId: "ou-1", label: "Mitglieder" },
    ]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue({
      audienceSpec: { composition: "UNION", components: [{ label: "Mitglieder", structural: { orgUnitIds: ["ou-1"] } }] },
      audienceLabel: "Mitglieder",
      primaryTeamId: null,
      teamIds: [],
      teamName: "Mitglieder",
      teamNamesLabel: "Mitglieder",
      communicationPath: "CLUB",
      participationEntries: [],
    });
    mocks.resolveClubEventAudiencePreview.mockResolvedValue({
      canCommunicate: true,
      communicationScope: "CLUB",
      audience: {
        teamId: "evt-gv",
        teamName: "Mitglieder",
        teamNamesLabel: "Mitglieder",
        recipientPreviewLabel: null,
        effectiveRecipientCount: 3,
        zeroRecipients: false,
      },
    });

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    expect(impact?.audience?.teamNamesLabel).toBe("Mitglieder");
  });
});
