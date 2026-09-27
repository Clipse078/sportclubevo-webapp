/**
 * SCE-AUTH-LOGOUT-03 — canonical server logout invalidates JWT via Auth.js.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignOut, mockAuth } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockAuth: vi.fn(),
}));

vi.mock("@/auth", () => ({
  signOut: mockSignOut,
  auth: mockAuth,
}));

const { mockRevokeInstallation } = vi.hoisted(() => ({
  mockRevokeInstallation: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/push/push-device-registration-service", () => ({
  revokePushDeviceForInstallation: mockRevokeInstallation,
}));

describe("signOutAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("invalidates the session via Auth.js without server redirect", async () => {
    const { signOutAction } = await import("../auth-actions");

    await signOutAction();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({
      redirect: false,
      redirectTo: "/login",
    });
    expect(mockRevokeInstallation).not.toHaveBeenCalled();
  });

  it("revokes only the current installation when installationId is provided", async () => {
    const { signOutAction } = await import("../auth-actions");

    await signOutAction("inst-browser-1");

    expect(mockRevokeInstallation).toHaveBeenCalledWith({
      userId: "user-1",
      installationId: "inst-browser-1",
    });
  });
});
