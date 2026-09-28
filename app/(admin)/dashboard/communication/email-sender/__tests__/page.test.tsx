// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  getActiveTenant: vi.fn(),
  loadModel: vi.fn(),
}));

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
  useToast: () => ({ toast: { success: vi.fn(), danger: vi.fn() } }),
}));

import EmailSenderPage from "../page";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildEmailSenderReadinessPresentation } from "@/lib/communication/email-sender-display";

const settings = {
  displayName: "FC Allschwil",
  emailAddress: "info@fcallschwil.ch",
  providerStatus: "VERIFIED" as const,
  activeSource: "TENANT" as const,
  activeFrom: "FC Allschwil <info@fcallschwil.ch>",
  platformFallbackActive: false,
};

const readiness = {
  ready: true,
  senderConfigured: true,
  transportConfigured: true,
  fromAddressValid: true,
  activeSource: "TENANT" as const,
  providerStatus: "VERIFIED" as const,
  platformFallbackActive: false,
  reasons: [] as string[],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue(undefined);
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-a" });
  mocks.loadModel.mockResolvedValue({
    settings,
    readiness,
    readinessPresentation: buildEmailSenderReadinessPresentation(readiness, settings),
    effectiveSender: {
      displayName: "FC Allschwil",
      emailAddress: "info@fcallschwil.ch",
      formattedFrom: settings.activeFrom,
      source: "TENANT",
      usedForNewCommunicationEmail: true,
    },
    configuredSender: { displayName: settings.displayName, emailAddress: settings.emailAddress },
    platformFallbackSender: null,
    replyTo: {
      fromDisplayName: "FC Allschwil",
      fromEmailAddress: "info@fcallschwil.ch",
      replyToHeadline: "Reply-To (Antworten)",
      replyToBody: "test",
      communicationCenterLinkLabel: "Kommunikationscenter-Einstellungen",
      communicationCenterHref: "/dashboard/communication/inbox/settings",
      broadcastNote: "broadcast",
      informOnlyNote: "inform",
    },
    inboundReplyRoutingConfigured: false,
  });
});

describe("canonical Kommunikation email sender page", () => {
  it("renders the sender workspace with loaded tenant settings", async () => {
    render(await EmailSenderPage());

    expect(mocks.requirePermission).toHaveBeenCalledWith([
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
    ]);
    expect(mocks.loadModel).toHaveBeenCalledWith("tenant-a");
    expect(screen.getByTestId("email-sender-form")).toBeInTheDocument();
    expect(screen.getByLabelText("Absendername")).toHaveValue("FC Allschwil");
    expect(screen.getByLabelText("Absender-E-Mail-Adresse")).toHaveValue("info@fcallschwil.ch");
    expect(screen.getByRole("button", { name: "Absender speichern" })).toBeEnabled();
  });

  it("denies access before loading tenant sender data", async () => {
    mocks.requirePermission.mockRejectedValue(new Error("Forbidden"));

    await expect(EmailSenderPage()).rejects.toThrow("Forbidden");
    expect(mocks.getActiveTenant).not.toHaveBeenCalled();
    expect(mocks.loadModel).not.toHaveBeenCalled();
  });
});
