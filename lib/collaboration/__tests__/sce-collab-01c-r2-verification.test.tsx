/**
 * SCE-COLLAB-01C-R2 — audience state, auth path, zero-recipient composer, save UX.
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import deMessages from "@/messages/de.json";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import { ActivityChangeCollaborationProvider } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeSet } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import {
  classifyClubEventParticipationAudience,
  resolveClubEventCommunicationPathFromEntries,
} from "@/lib/collaboration/club-event/club-event-audience-presentation";
import { buildAudienceSpecFromEntries } from "@/lib/collaboration/club-event/resolve-club-event-audience";
import { resolveClubEventCommunicationScope } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";
import { resolveClubEventCollaborationImpactAfterChange } from "@/lib/collaboration/club-event/club-event-collaboration-impact-service";
import VeranstaltungEditForm from "@/components/admin/veranstaltungen/VeranstaltungEditForm";
import { VeranstaltungEditSubmitProvider } from "@/components/admin/veranstaltungen/VeranstaltungEditSubmitContext";
import VeranstaltungEditTopSaveButton from "@/components/admin/veranstaltungen/VeranstaltungEditTopSaveButton";
import { VERANSTALTUNG_EDIT_FORM_ID } from "@/components/admin/veranstaltungen/veranstaltung-edit-form-id";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";

const mocks = vi.hoisted(() => ({
  listClubEventAudienceEntries: vi.fn(),
  resolveClubEventAudienceContext: vi.fn(),
  resolveClubEventAudiencePreview: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveClubCommunicationAuthorization: vi.fn(),
  fetchMock: vi.fn(),
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

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: (...args: unknown[]) =>
    mocks.resolveContextualCommunicationSendAuthorization(...args),
}));

vi.mock("@/lib/communication/club/club-communication-authorization", () => ({
  resolveClubCommunicationAuthorization: (...args: unknown[]) =>
    mocks.resolveClubCommunicationAuthorization(...args),
}));

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

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("SCE-COLLAB-01C-R2 participation audience conversion", () => {
  it("R2-01 builds spec from resolvable ORG_UNIT participation entry", () => {
    const spec = buildAudienceSpecFromEntries([
      { id: "1", kind: "ORG_UNIT", referenceId: "ou-members", label: "Mitglieder" },
    ]);
    expect(spec?.components.some((c) => c.structural?.orgUnitIds?.includes("ou-members"))).toBe(
      true,
    );
  });

  it("R2-14 no audience configured does not fabricate spec", () => {
    expect(buildAudienceSpecFromEntries([])).toBeNull();
    expect(classifyClubEventParticipationAudience([]).state).toBe("NONE");
  });

  it("R2-15 invalid reference does not expose ids in classification", () => {
    const c = classifyClubEventParticipationAudience([
      { id: "x", kind: "ROLE", referenceId: "", label: "—" },
    ]);
    expect(c.state).toBe("INVALID");
  });
});

describe("SCE-COLLAB-01C-R2 communication path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R2-08 TEAM-only audience selects TEAM path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "TEAM", referenceId: "team-1", label: "Junioren F2" },
      ]),
    ).toBe("TEAM");
  });

  it("R2-09 ROLE-only audience selects CLUB path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "ROLE", referenceId: "role-1", label: "Vorstand" },
      ]),
    ).toBe("CLUB");
  });

  it("R2-10 ORG_UNIT-only audience selects CLUB path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "ORG_UNIT", referenceId: "ou-1", label: "Junioren" },
      ]),
    ).toBe("CLUB");
  });

  it("R2-11 PERSON-only audience selects CLUB path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "PERSON", referenceId: "p-1", label: "Max Muster" },
      ]),
    ).toBe("CLUB");
  });

  it("R2-12 mixed audience selects CLUB path", () => {
    expect(
      resolveClubEventCommunicationPathFromEntries([
        { id: "1", kind: "TEAM", referenceId: "team-1", label: "Junioren F2" },
        { id: "2", kind: "ROLE", referenceId: "role-1", label: "Vorstand" },
      ]),
    ).toBe("CLUB");
  });

  it("R2-08b TEAM-only uses team send authorization only", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveClubCommunicationAuthorization.mockResolvedValue({ canSend: false });

    const result = await resolveClubEventCommunicationScope({
      tenantId: "t1",
      tenantKey: "fca",
      userId: "u1",
      audienceContext: {
        audienceSpec: { composition: "UNION", components: [] },
        audienceLabel: "Junioren F2",
        primaryTeamId: "team-1",
        teamIds: ["team-1"],
        teamName: "Junioren F2",
        teamNamesLabel: "Junioren F2",
        communicationPath: "TEAM",
        participationEntries: [],
      },
    });

    expect(result.scope).toBe("TEAM");
    expect(result.canCommunicate).toBe(true);
    expect(mocks.resolveClubCommunicationAuthorization).not.toHaveBeenCalled();
  });

  it("R2-09b ROLE-only uses club send authorization", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    mocks.resolveClubCommunicationAuthorization.mockResolvedValue({ canSend: true });

    const result = await resolveClubEventCommunicationScope({
      tenantId: "t1",
      tenantKey: "fca",
      userId: "u1",
      audienceContext: {
        audienceSpec: { composition: "UNION", components: [] },
        audienceLabel: "Vorstand",
        primaryTeamId: null,
        teamIds: [],
        teamName: "Veranstaltungsteilnehmer",
        teamNamesLabel: "Vorstand",
        communicationPath: "CLUB",
        participationEntries: [],
      },
    });

    expect(result.scope).toBe("CLUB");
    expect(result.canCommunicate).toBe(true);
    expect(mocks.resolveContextualCommunicationSendAuthorization).not.toHaveBeenCalled();
  });
});

describe("SCE-COLLAB-01C-R2 impact surface", () => {
  const changeSet = buildClubEventActivityChangeSet(
    clubSnap(),
    clubSnap({ startTime: "20:30" }),
  )!;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mocks.fetchMock as typeof fetch;
  });

  function renderImpact(impact: ActivityChangeImpact) {
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
  }

  it("R2-02/R2-03/R2-04 zero recipients still shows audience, count 0, communicate", () => {
    renderImpact({
      worthy: true,
      activityTitle: "Mitgliederversammlung",
      activityScheduleLine: null,
      changeSet,
      canCommunicate: true,
      audience: {
        teamId: "evt-gv",
        teamName: "Mitglieder",
        teamNamesLabel: "Mitglieder",
        recipientPreviewLabel: null,
        effectiveRecipientCount: 0,
        zeroRecipients: true,
      },
    });

    expect(screen.getByTestId("contextual-activity-change-audience")).toHaveTextContent("Mitglieder");
    expect(screen.getByTestId("contextual-activity-change-recipient-count")).toHaveTextContent("0");
    expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
  });

  it("R2-05/R2-06/R2-07 composer opens with canDispatch false when zero recipients", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        draftId: "draft-1",
        teamId: null,
        communicationScope: "CLUB",
        subject: "Änderung: Mitgliederversammlung",
        bodyText: "Zeit 20:00 → 20:30",
        audienceLabel: "Mitglieder",
        recipientCount: 0,
        canDispatch: false,
      }),
    });

    renderImpact({
      worthy: true,
      activityTitle: "Mitgliederversammlung",
      activityScheduleLine: null,
      changeSet,
      canCommunicate: true,
      audience: {
        teamId: "evt-gv",
        teamName: "Mitglieder",
        teamNamesLabel: "Mitglieder",
        recipientPreviewLabel: null,
        effectiveRecipientCount: 0,
        zeroRecipients: true,
      },
    });

    fireEvent.click(screen.getByTestId("contextual-activity-change-communicate"));

    await waitFor(() => {
      expect(screen.getByText("Mitteilung vorbereiten")).toBeInTheDocument();
    });
    expect(mocks.fetchMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Senden" })).toBeDisabled();
  });

  it("R2-13 unauthorized actor sees no recipient enumeration", () => {
    renderImpact({
      worthy: true,
      activityTitle: "Mitgliederversammlung",
      activityScheduleLine: null,
      changeSet,
      canCommunicate: false,
      audience: {
        teamId: "evt-gv",
        teamName: "Mitglieder",
        teamNamesLabel: "Mitglieder",
        recipientPreviewLabel: null,
        effectiveRecipientCount: null,
        zeroRecipients: false,
      },
    });

    expect(screen.queryByTestId("contextual-activity-change-recipient-count")).toBeNull();
    expect(screen.queryByTestId("contextual-activity-change-communicate")).toBeNull();
  });

  it("R2-14 no audience configured explains state without fabricating communicate", async () => {
    mocks.listClubEventAudienceEntries.mockResolvedValue([]);
    mocks.resolveClubEventAudienceContext.mockResolvedValue(null);

    const impact = await resolveClubEventCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: clubSnap(),
      after: clubSnap({ startTime: "20:30" }),
    });

    expect(impact?.audience?.audienceNotConfigured).toBe(true);
    expect(impact?.canCommunicate).toBe(false);

    renderImpact(impact!);
    expect(screen.getByTestId("contextual-activity-change-audience")).toHaveTextContent(
      "Keine Zielgruppe festgelegt",
    );
    expect(screen.getByTestId("contextual-activity-change-configure-audience")).toBeInTheDocument();
    expect(screen.queryByTestId("contextual-activity-change-communicate")).toBeNull();
  });
});

describe("SCE-COLLAB-01C-R2 save UX", () => {
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

  it("R2-19 bottom Save button no longer exists; R2-20 top save submits form", async () => {
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

    expect(screen.queryByTestId("veranstaltung-edit-save")).toBeNull();
    const top = screen.getByTestId("veranstaltung-edit-save-top");
    expect(top).toHaveAttribute("form", VERANSTALTUNG_EDIT_FORM_ID);
    fireEvent.click(top);
    await waitFor(() => expect(mocks.fetchMock).toHaveBeenCalledTimes(1));
  });
});
