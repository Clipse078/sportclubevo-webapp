import { beforeEach, describe, expect, it, vi } from "vitest";

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

import EmailSenderPage from "../../../communication/email-sender/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermission.mockResolvedValue(undefined);
  mocks.getActiveTenant.mockResolvedValue({ id: "tenant-a" });
  mocks.loadModel.mockResolvedValue({
    settings: {
      displayName: null,
      emailAddress: null,
      providerStatus: "NOT_CONFIGURED",
      activeSource: "PLATFORM",
      activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
      platformFallbackActive: true,
    },
  });
});

describe("COMM-03B canonical email sender page authorization", () => {
  it("loads the active tenant settings for an authorized tenant admin", async () => {
    await EmailSenderPage();
    expect(mocks.requirePermission).toHaveBeenCalledWith(["users.manage_memberships"]);
    expect(mocks.loadModel).toHaveBeenCalledWith("tenant-a");
  });

  it("does not load or expose settings when authorization fails", async () => {
    mocks.requirePermission.mockRejectedValue(new Error("Forbidden"));
    await expect(EmailSenderPage()).rejects.toThrow("Forbidden");
    expect(mocks.getActiveTenant).not.toHaveBeenCalled();
    expect(mocks.loadModel).not.toHaveBeenCalled();
  });
});
