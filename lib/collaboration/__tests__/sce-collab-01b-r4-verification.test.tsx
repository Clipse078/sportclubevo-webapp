/**
 * SCE-COLLAB-01B-R4 — composer crash after cumulative prepare (ToastProvider boundary).
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventActivityCollaborationHost } from "@/components/admin/collaboration/EventActivityCollaborationHost";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import { useActivityChangeCollaboration } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { buildTournamentActivityChangeSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { prepareTournamentActivityChangeCommunicationDraft } from "@/lib/collaboration/contextual-communication-service";

const messages = {
  Collaboration: {
    activityChange: {
      tournamentUpdated: "Turnier aktualisiert",
      multipleChanges: "{count} Änderungen",
      audience: "Zielgruppe",
      recipients: "Empfänger",
      noRecipientsTitle: "Keine Empfänger verfügbar",
      noRecipientsBody:
        "Für die ausgewählten Teams konnten aktuell keine berechtigten Empfänger ermittelt werden. Die Mitteilung kann deshalb noch nicht gesendet werden.",
      sendDisabledNoRecipients: "Senden nicht möglich",
      zeroRecipients: "Für diese Zielgruppe konnten aktuell keine Empfänger ermittelt werden.",
      communicateChange: "Änderung kommunizieren",
      dismiss: "Schliessen",
      prepareError: "Vorbereitung fehlgeschlagen.",
      publishError: "Fehler",
      publishSuccess: "Gesendet an {count} Empfänger.",
      composerTitle: "Mitteilung vorbereiten",
      composerClose: "Schliessen",
      composerCancel: "Abbrechen",
      composerSend: "Senden",
      fieldSubject: "Betreff",
      fieldBody: "Inhalt",
    },
  },
};

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-playmore",
    tenantId: "tenant-1",
    teamId: "team-f3",
    teamName: "Junioren F3",
    teamSeasonId: "ts-1",
    title: "PlayMore Turnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "10:15",
    endTime: "12:00",
    locationLabel: "Im Brüel",
    resourceLabel: "Hauptfeld",
    playableVenueLabel: "Im Brüel",
    scheduleLine: "Montag · 10:15–12:00",
    ...overrides,
  };
}

const cumulativeChangeSet = buildTournamentActivityChangeSet(
  tourSnap({ startTime: "10:00", resourceLabel: "Kunstrasen 2" }),
  tourSnap({ startTime: "10:15", resourceLabel: "Hauptfeld" }),
)!;

const cumulativeImpact: ActivityChangeImpact = {
  worthy: true,
  activityTitle: "PlayMore Turnier",
  activityScheduleLine: tourSnap().scheduleLine,
  changeSet: cumulativeChangeSet,
  audience: {
    teamId: "team-f3",
    teamIds: ["team-f3", "team-f2"],
    teamName: "Junioren F3",
    teamNamesLabel: "Junioren F3, Junioren F2",
    recipientPreviewLabel: null,
    effectiveRecipientCount: 0,
    zeroRecipients: true,
  },
  canCommunicate: true,
};

const mocks = vi.hoisted(() => ({
  loadTournamentActivitySnapshot: vi.fn(),
  resolveTournamentAudienceContext: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  platformCommunicationFindMany: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
}));

vi.mock("@/lib/collaboration/tournament/tournament-activity-snapshot", () => ({
  loadTournamentActivitySnapshot: mocks.loadTournamentActivitySnapshot,
}));

vi.mock("@/lib/collaboration/tournament/resolve-tournament-audience", () => ({
  resolveTournamentAudienceContext: mocks.resolveTournamentAudienceContext,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: mocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: {
      findMany: mocks.platformCommunicationFindMany,
    },
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: mocks.createTeamCommunicationDraft,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: vi.fn().mockResolvedValue({ summary: { effectiveCount: 0 } }),
}));

describe("SCE-COLLAB-01B-R4 tournament cumulative prepare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadTournamentActivitySnapshot.mockResolvedValue(tourSnap());
    mocks.resolveTournamentAudienceContext.mockResolvedValue({
      primaryTeamId: "team-f3",
      teamIds: ["team-f3", "team-f2"],
      teamName: "Junioren F3",
      teamNamesLabel: "Junioren F3, Junioren F2",
    });
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-r4" });
  });

  it("R4-01/R4-02 prepare cumulative TIME + RESOURCE does not throw and body contains both", async () => {
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.draftId).toBe("draft-r4");
    expect(result.bodyText).toContain("10:00");
    expect(result.bodyText).toContain("10:15");
    expect(result.bodyText).toContain("Kunstrasen 2");
    expect(result.bodyText).toContain("Hauptfeld");
  });

  it("R4-03 fingerprint matches cumulative changeSet", async () => {
    await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        orchestrationMetaJson: expect.objectContaining({
          changeFingerprint: cumulativeChangeSet.fingerprint,
        }),
      }),
    );
  });

  it("R4-04 repeated prepare reuses draft for same fingerprint", async () => {
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "draft-existing",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "TOURNAMENT",
          activityId: "tour-playmore",
          changeFingerprint: cumulativeChangeSet.fingerprint,
        },
      },
    ]);
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.reusedExistingDraft).toBe(true);
    expect(result.draftId).toBe("draft-existing");
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });
});

describe("SCE-COLLAB-01B-R4 composer ToastProvider boundary", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          draftId: "draft-ui",
          teamId: "team-f3",
          subject: "Turnier angepasst",
          bodyText: "Das Turnier wurde angepasst.\n\n• Zeit: 10:00 → 10:15\n• Spielfeld: Kunstrasen 2 → Hauptfeld",
          audienceLabel: "Junioren F3, Junioren F2",
          recipientCount: 0,
          canDispatch: false,
        }),
      }),
    );
  });

  it("R4-05/R4-22 EventActivityCollaborationHost opens composer without page crash", async () => {
    function SeedImpact() {
      const { setImpact, setCycleBaseline } = useActivityChangeCollaboration();
      useEffect(() => {
        setImpact(cumulativeImpact);
        setCycleBaseline("TOURNAMENT", "tour-playmore", {
          tournamentId: "tour-playmore",
          dateKey: "2026-10-20",
          startTime: "10:00",
          endTime: "12:00",
          locationLabel: "Im Brüel",
          resourceLabel: "Kunstrasen 2",
          status: "SCHEDULED",
        });
      }, [setCycleBaseline, setImpact]);
      return null;
    }

    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <EventActivityCollaborationHost domain="TOURNAMENT" activityId="tour-playmore">
          <SeedImpact />
          <div data-testid="tournament-page-stub">page</div>
        </EventActivityCollaborationHost>
      </NextIntlClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("contextual-activity-change-impact")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("contextual-activity-change-communicate"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("contextual-activity-communication-composer")).toBeInTheDocument();
      expect(screen.getByTestId("tournament-page-stub")).toBeInTheDocument();
    });
    const bodyField = screen.getByTestId("contextual-activity-communication-body") as HTMLTextAreaElement;
    expect(bodyField.value).toContain("10:00 → 10:15");
    expect(bodyField.value).toContain("Kunstrasen 2 → Hauptfeld");
  });

  it("R4-11 composer cancel preserves impact banner", async () => {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <EventActivityCollaborationHost domain="TOURNAMENT" activityId="tour-playmore">
          <ContextualActivityChangeImpactSurface
            domain="TOURNAMENT"
            activityId="tour-playmore"
            impact={cumulativeImpact}
            onDismiss={vi.fn()}
          />
        </EventActivityCollaborationHost>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByTestId("contextual-activity-change-communicate"));
    await waitFor(() => screen.getByTestId("contextual-activity-communication-composer"));
    fireEvent.click(screen.getByText("Abbrechen"));
    expect(screen.getByTestId("contextual-activity-change-impact")).toBeInTheDocument();
    expect(screen.queryByTestId("contextual-activity-communication-composer")).not.toBeInTheDocument();
  });
});
