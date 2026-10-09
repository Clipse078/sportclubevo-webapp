/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { ActivityChangeCollaborationProvider } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { ContextualActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualActivityChangeImpactSurface";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";

const messages = {
  Collaboration: {
    activityChange: {
      trainingUpdated: "Training aktualisiert",
      multipleChanges: "{count} Änderungen",
      audience: "Zielgruppe",
      zeroRecipients: "Keine Empfänger",
      communicateChange: "Änderung kommunizieren",
      dismiss: "Schliessen",
      prepareError: "Fehler",
      publishError: "Fehler",
      publishSuccess: "OK",
      composerTitle: "Entwurf",
      composerClose: "X",
      composerCancel: "Abbrechen",
      composerSend: "Senden",
      fieldSubject: "Betreff",
      fieldBody: "Inhalt",
    },
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <ActivityChangeCollaborationProvider>{ui}</ActivityChangeCollaborationProvider>
    </NextIntlClientProvider>,
  );
}

const impact: ActivityChangeImpact = {
  worthy: true,
  activityTitle: "Junioren F2 Training",
  activityScheduleLine: "Mi · 15:45",
  changeSet: {
    domain: "TRAINING",
    activityId: "sess-1",
    fingerprint: "abc",
    entries: [
      {
        field: "VENUE",
        oldValue: "A",
        newValue: "B",
        displayOld: "Im Brüel · KR2",
        displayNew: "Gartenschulhaus Halle",
        significant: true,
      },
    ],
  },
  audience: {
    teamId: "team-1",
    teamName: "Junioren F2",
    recipientPreviewLabel: "Junioren F2 · 18 Empfänger",
    effectiveRecipientCount: 18,
    zeroRecipients: false,
  },
  canCommunicate: true,
};

describe("ContextualActivityChangeImpactSurface", () => {
  it("renders change summary and communicate action", () => {
    renderWithIntl(
      <ContextualActivityChangeImpactSurface
        domain="TRAINING"
        activityId="sess-1"
        impact={impact}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByTestId("contextual-activity-change-impact")).toBeInTheDocument();
    expect(screen.getByText(/Im Brüel · KR2/)).toBeInTheDocument();
    expect(screen.getByTestId("contextual-activity-change-communicate")).toBeInTheDocument();
  });

  it("calls dismiss handler", () => {
    const onDismiss = vi.fn();
    renderWithIntl(
      <ContextualActivityChangeImpactSurface
        domain="TRAINING"
        activityId="sess-1"
        impact={impact}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId("contextual-activity-change-dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });
});
