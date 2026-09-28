// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const toastSuccess = vi.fn();
const toastDanger = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: {
      success: toastSuccess,
      danger: toastDanger,
    },
  }),
}));

import EmailSenderWorkspace from "@/components/admin/communication/email-sender/EmailSenderWorkspace";
import { buildEmailSenderReadinessPresentation } from "@/lib/communication/email-sender-display";
import type { EmailSenderWorkspaceViewModel } from "@/lib/communication/email-sender-workspace";

const configured = {
  displayName: "FC Allschwil",
  emailAddress: "info@fcallschwil.ch",
  providerStatus: "VERIFIED" as const,
  activeSource: "TENANT" as const,
  activeFrom: "FC Allschwil <info@fcallschwil.ch>",
  platformFallbackActive: false,
};

function modelFrom(settings = configured, ready = true): EmailSenderWorkspaceViewModel {
  const readiness = {
    ready,
    senderConfigured: true,
    transportConfigured: true,
    fromAddressValid: true,
    activeSource: settings.activeSource,
    providerStatus: settings.providerStatus,
    platformFallbackActive: settings.platformFallbackActive,
    reasons: [] as string[],
  };
  return {
    settings,
    readiness,
    readinessPresentation: buildEmailSenderReadinessPresentation(readiness, settings),
    effectiveSender: {
      displayName: "FC Allschwil",
      emailAddress: "info@fcallschwil.ch",
      formattedFrom: settings.activeFrom,
      source: settings.activeSource,
      usedForNewCommunicationEmail: ready,
    },
    configuredSender: {
      displayName: settings.displayName,
      emailAddress: settings.emailAddress,
    },
    platformFallbackSender: null,
    replyTo: {
      fromDisplayName: "FC Allschwil",
      fromEmailAddress: "info@fcallschwil.ch",
      replyToHeadline: "Reply-To (Antworten)",
      replyToBody: "Antworten werden weiterhin automatisch dem richtigen Vorgang zugeordnet.",
      communicationCenterLinkLabel: "Kommunikationscenter-Einstellungen",
      communicationCenterHref: "/dashboard/communication/inbox/settings",
      broadcastNote: "Broadcast note",
      informOnlyNote: "Inform note",
    },
    inboundReplyRoutingConfigured: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("COMM-03B email sender settings UI (UX-08 workspace)", () => {
  it("renders tenant-wide sender fields and Reply-To explanation", () => {
    render(<EmailSenderWorkspace initialModel={modelFrom()} />);
    expect(screen.getByLabelText("Absendername")).toHaveValue("FC Allschwil");
    expect(screen.getByLabelText("Absender-E-Mail-Adresse")).toHaveValue("info@fcallschwil.ch");
    expect(screen.getByText("Konfigurierter Absender")).toBeInTheDocument();
    expect(screen.getByText("Reply-To (Antworten)")).toBeInTheDocument();
  });

  it("shows unverified platform fallback state", () => {
    render(
      <EmailSenderWorkspace
        initialModel={modelFrom(
          {
            ...configured,
            providerStatus: "NOT_VERIFIED",
            activeSource: "PLATFORM",
            activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
            platformFallbackActive: true,
          },
          true,
        )}
      />,
    );
    expect(screen.getByText(/Fallback aktiv|Absender nicht verifiziert/)).toBeInTheDocument();
  });

  it("edits and saves sender identity without a client tenantId", async () => {
    const updated = {
      ...configured,
      displayName: "Neuer Club",
      emailAddress: "mail@neuer-club.ch",
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ settings: updated }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            readiness: {
              ready: true,
              senderConfigured: true,
              transportConfigured: true,
              fromAddressValid: true,
              activeSource: "TENANT",
              providerStatus: "VERIFIED",
              platformFallbackActive: false,
              reasons: [],
            },
            sender: updated,
          }),
          { status: 200 },
        ),
      );

    render(<EmailSenderWorkspace initialModel={modelFrom()} />);

    fireEvent.change(screen.getByLabelText("Absendername"), {
      target: { value: "Neuer Club" },
    });
    fireEvent.change(screen.getByLabelText("Absender-E-Mail-Adresse"), {
      target: { value: "mail@neuer-club.ch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Absender speichern" }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("Versandbereitschaft")),
    );
    const [, options] = vi.mocked(fetch).mock.calls[0]!;
    expect(JSON.parse(String(options?.body))).toEqual({
      displayName: "Neuer Club",
      emailAddress: "mail@neuer-club.ch",
    });
  });

  it("does not expose technical Reply-To configuration secrets", () => {
    render(<EmailSenderWorkspace initialModel={modelFrom()} />);
    expect(screen.queryByText(/reply\+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EMAIL_INBOUND_DOMAIN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RESEND_API_KEY/i)).not.toBeInTheDocument();
  });
});
