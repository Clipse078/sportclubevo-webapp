/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContextualActivityCommunicationComposer } from "@/components/admin/collaboration/ContextualActivityCommunicationComposer";
import { CONTEXTUAL_COMMUNICATION_ERROR_CODES } from "@/lib/collaboration/contextual-communication-http";

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const messages = {
  Collaboration: {
    activityChange: {
      noRecipientsTitle: "Keine Empfänger verfügbar",
      noRecipientsBody: "Keine berechtigten Empfänger.",
      sendDisabledNoRecipients: "Senden nicht möglich",
      audience: "Zielgruppe",
      recipients: "Empfänger",
      publishError: "Fehler",
      publishSuccess: "OK {count}",
      composerTitle: "Entwurf",
      composerClose: "X",
      composerCancel: "Abbrechen",
      composerSend: "Senden",
      fieldSubject: "Betreff",
      fieldBody: "Inhalt",
    },
  },
};

describe("ContextualActivityCommunicationComposer R5", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("R5-09 disables send when canDispatch is false", () => {
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <ContextualActivityCommunicationComposer
          domain="TOURNAMENT"
          activityId="tour-1"
          teamId="team-1"
          draftId="draft-1"
          initialSubject="S"
          initialBody="Body"
          audienceLabel="Junioren F2, Junioren F3"
          recipientCount={0}
          canDispatch={false}
          onClose={vi.fn()}
          onPublished={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTestId("contextual-activity-communication-no-recipients")).toBeInTheDocument();
    expect(screen.getByTestId("contextual-activity-communication-send")).toBeDisabled();
  });

  it("R5-11 never surfaces raw English zero-recipient error on publish failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          errorCode: CONTEXTUAL_COMMUNICATION_ERROR_CODES.NO_ELIGIBLE_RECIPIENTS,
          error: "Deutsch",
        }),
      }),
    );
    render(
      <NextIntlClientProvider locale="de" messages={messages}>
        <ContextualActivityCommunicationComposer
          domain="TOURNAMENT"
          activityId="tour-1"
          teamId="team-1"
          draftId="draft-1"
          initialSubject="S"
          initialBody="Body"
          recipientCount={1}
          canDispatch={true}
          onClose={vi.fn()}
          onPublished={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    fireEvent.click(screen.getByTestId("contextual-activity-communication-send"));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Keine berechtigten Empfänger");
    });
    expect(screen.queryByText(/no eligible recipients/i)).toBeNull();
  });
});
