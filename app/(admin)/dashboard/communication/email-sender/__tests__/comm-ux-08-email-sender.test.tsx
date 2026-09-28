// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getActiveTenant: vi.fn(),
  loadModel: vi.fn(),
}));

const toastSuccess = vi.fn();
const toastDanger = vi.fn();

vi.mock("@/lib/permissions/require-any-permission", () => ({
  requireAnyPermission: mocks.requirePermission,
}));
vi.mock("@/lib/tenants/active-tenant", () => ({
  getActiveTenant: mocks.getActiveTenant,
}));
vi.mock("@/lib/communication/email-sender-workspace", () => ({
  loadEmailSenderWorkspaceViewModel: mocks.loadModel,
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: { success: toastSuccess, danger: toastDanger },
  }),
}));

import EmailSenderPage from "../page";
import EmailSenderWorkspace from "@/components/admin/communication/email-sender/EmailSenderWorkspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildEmailSenderReadinessPresentation,
  EMAIL_SENDER_WORKSPACE_DESCRIPTION,
} from "@/lib/communication/email-sender-display";
import type { EmailSenderWorkspaceViewModel } from "@/lib/communication/email-sender-workspace";

const settingsVerified = {
  displayName: "FC Allschwil",
  emailAddress: "kommunikation@fcallschwil.ch",
  providerStatus: "VERIFIED" as const,
  activeSource: "TENANT" as const,
  activeFrom: "FC Allschwil <kommunikation@fcallschwil.ch>",
  platformFallbackActive: false,
};

const readinessReady = {
  ready: true,
  senderConfigured: true,
  transportConfigured: true,
  fromAddressValid: true,
  activeSource: "TENANT" as const,
  providerStatus: "VERIFIED" as const,
  platformFallbackActive: false,
  reasons: [] as string[],
};

function buildModel(overrides: Partial<EmailSenderWorkspaceViewModel> = {}): EmailSenderWorkspaceViewModel {
  const settings = overrides.settings ?? settingsVerified;
  const readiness = overrides.readiness ?? readinessReady;
  return {
    settings,
    readiness,
    readinessPresentation: buildEmailSenderReadinessPresentation(readiness, settings),
    effectiveSender: {
      displayName: "FC Allschwil",
      emailAddress: "kommunikation@fcallschwil.ch",
      formattedFrom: settings.activeFrom,
      source: settings.activeSource,
      usedForNewCommunicationEmail: readiness.ready,
    },
    configuredSender: {
      displayName: settings.displayName,
      emailAddress: settings.emailAddress,
    },
    platformFallbackSender: null,
    replyTo: {
      fromDisplayName: "FC Allschwil",
      fromEmailAddress: "kommunikation@fcallschwil.ch",
      replyToHeadline: "Reply-To (Antworten)",
      replyToBody: "From ist die sichtbare Absenderadresse.",
      communicationCenterLinkLabel: "Kommunikationscenter-Einstellungen",
      communicationCenterHref: "/dashboard/communication/inbox/settings",
      broadcastNote: "Mitteilungen und Kampagnen",
      informOnlyNote: "Nur informieren",
    },
    inboundReplyRoutingConfigured: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue(undefined);
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-a" });
  mocks.loadModel.mockResolvedValue(buildModel());
  vi.stubGlobal("fetch", vi.fn());
});

describe("SCE-COMM-UX-08 email sender page", () => {
  it("renders workspace header, description, readiness and active sender", async () => {
    render(await EmailSenderPage());

    expect(mocks.requirePermission).toHaveBeenCalledWith([
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
    ]);
    expect(screen.getByRole("heading", { level: 1, name: "E-Mail-Absender" })).toBeInTheDocument();
    expect(screen.getByText(EMAIL_SENDER_WORKSPACE_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByTestId("email-sender-readiness")).toBeInTheDocument();
    expect(screen.getByTestId("email-sender-active")).toBeInTheDocument();
    expect(screen.getByTestId("email-sender-form")).toBeInTheDocument();
    expect(screen.getByText("Bereit")).toBeInTheDocument();
    expect(screen.getByTestId("email-sender-active")).toHaveTextContent(
      "kommunikation@fcallschwil.ch",
    );
  });

  it("uses responsive layout classes on the workspace surface", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/communication/email-sender/EmailSenderWorkspace.tsx"),
      "utf8",
    );
    expect(source).toMatch(/flex-col/);
    expect(source).toMatch(/md:grid-cols-2/);
    expect(source).toMatch(/max-w-3xl/);
  });

  it("denies access before loading tenant sender data", async () => {
    mocks.requirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(EmailSenderPage()).rejects.toThrow("Forbidden");
    expect(mocks.loadModel).not.toHaveBeenCalled();
  });
});

describe("SCE-COMM-UX-08 readiness states", () => {
  it("shows provider-not-configured presentation", () => {
    const settings = { ...settingsVerified };
    const readiness = {
      ...readinessReady,
      ready: false,
      transportConfigured: false,
      reasons: ["TRANSPORT_NOT_CONFIGURED"],
    };
    render(
      <EmailSenderWorkspace
        initialModel={buildModel({
          settings,
          readiness,
          effectiveSender: {
            displayName: "FC Allschwil",
            emailAddress: "kommunikation@fcallschwil.ch",
            formattedFrom: settings.activeFrom,
            source: "TENANT",
            usedForNewCommunicationEmail: false,
          },
        })}
      />,
    );
    expect(screen.getByText("Provider nicht konfiguriert")).toBeInTheDocument();
  });

  it("shows fallback-active presentation", () => {
    const settings = {
      ...settingsVerified,
      activeSource: "PLATFORM" as const,
      activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
      platformFallbackActive: true,
      providerStatus: "NOT_VERIFIED" as const,
    };
    const readiness = {
      ...readinessReady,
      ready: true,
      platformFallbackActive: true,
      activeSource: "PLATFORM" as const,
      providerStatus: "NOT_VERIFIED" as const,
      reasons: ["SENDER_DOMAIN_NOT_VERIFIED", "TENANT_SENDER_NOT_CONFIGURED_USING_PLATFORM_FALLBACK"],
    };
    render(
      <EmailSenderWorkspace
        initialModel={buildModel({
          settings,
          readiness,
          platformFallbackSender: {
            displayName: "SportClubEvo",
            emailAddress: "noreply@mail.sportclubevo.com",
          },
          effectiveSender: {
            displayName: "SportClubEvo",
            emailAddress: "noreply@mail.sportclubevo.com",
            formattedFrom: settings.activeFrom,
            source: "PLATFORM",
            usedForNewCommunicationEmail: true,
          },
        })}
      />,
    );
    expect(screen.getByText("Fallback aktiv")).toBeInTheDocument();
    expect(screen.getByText(/SportClubEvo-Fallback/)).toBeInTheDocument();
  });

  it("shows unverified tenant sender state", () => {
    const settings = {
      ...settingsVerified,
      providerStatus: "NOT_VERIFIED" as const,
      activeSource: "PLATFORM" as const,
      activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
      platformFallbackActive: true,
    };
    const readiness = {
      ...readinessReady,
      ready: true,
      platformFallbackActive: true,
      providerStatus: "NOT_VERIFIED" as const,
      reasons: ["SENDER_DOMAIN_NOT_VERIFIED"],
    };
    render(
      <EmailSenderWorkspace
        initialModel={buildModel({
          settings,
          readiness,
        })}
      />,
    );
    expect(screen.getByText(/Absender nicht verifiziert|Fallback aktiv/)).toBeInTheDocument();
  });
});

describe("SCE-COMM-UX-08 sender editing", () => {
  it("rejects invalid email client-side via server field errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Bitte geben Sie eine gültige Absender-E-Mail ein.",
          field: "emailAddress",
        }),
        { status: 400 },
      ),
    );
    render(<EmailSenderWorkspace initialModel={buildModel()} />);
    fireEvent.change(screen.getByLabelText("Absender-E-Mail-Adresse"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Absender speichern" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/gültige Absender-E-Mail/),
    );
  });

  it("refetches readiness after save instead of assuming ready", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ settings: settingsVerified }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            readiness: { ...readinessReady, ready: false, reasons: ["SENDER_DOMAIN_NOT_VERIFIED"] },
            sender: {
              ...settingsVerified,
              providerStatus: "NOT_VERIFIED",
              platformFallbackActive: true,
              activeSource: "PLATFORM",
              activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
            },
          }),
          { status: 200 },
        ),
      );

    render(<EmailSenderWorkspace initialModel={buildModel()} />);
    fireEvent.click(screen.getByRole("button", { name: "Absender speichern" }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringContaining("Versandbereitschaft wurde neu bewertet"),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("Absender nicht verifiziert")).toBeInTheDocument(),
    );
  });
});

describe("SCE-COMM-UX-08 Reply-To and boundaries", () => {
  it("shows distinct From and Reply-To sections without secrets", () => {
    render(<EmailSenderWorkspace initialModel={buildModel()} />);
    expect(screen.getByTestId("email-sender-reply-to")).toBeInTheDocument();
    expect(screen.getByText("From (sichtbarer Absender)")).toBeInTheDocument();
    expect(screen.getByText("Reply-To (Antworten)")).toBeInTheDocument();
    expect(screen.queryByText(/RESEND_API_KEY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/billing@sportclubevo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Billing-SMTP/)).toBeInTheDocument();
  });

  it("does not import billing transport from the page module", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/communication/email-sender/page.tsx"),
      "utf8",
    );
    expect(pageSource).not.toContain("billing-email-transport");
    expect(pageSource).toContain("loadEmailSenderWorkspaceViewModel");
  });
});

describe("SCE-COMM-UX-08 security", () => {
  it("readiness API route does not expose secret env keys in JSON shape", () => {
    const routeSource = readFileSync(
      join(process.cwd(), "app/api/communication/email/readiness/route.ts"),
      "utf8",
    );
    expect(routeSource).not.toContain("RESEND_API_KEY");
    expect(routeSource).not.toMatch(/process\.env\.RESEND/);
  });
});
