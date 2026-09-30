import { describe, expect, it } from "vitest";
import { resolvePersonAccessStatus } from "@/lib/admin/users/person-access-status";

describe("resolvePersonAccessStatus", () => {
  it("pending invitation is not represented as Zugriff gesperrt", () => {
    const status = resolvePersonAccessStatus({
      pendingInvitation: true,
      membershipIsActive: false,
      userIsActive: true,
    });
    expect(status.primaryLabel).toBe("Einladung ausstehend");
    expect(status.isPendingInvitation).toBe(true);
    expect(status.primaryLabel).not.toBe("Zugriff gesperrt");
  });

  it("active member", () => {
    const status = resolvePersonAccessStatus({
      pendingInvitation: false,
      membershipIsActive: true,
      userIsActive: true,
    });
    expect(status.primaryLabel).toBe("Aktiv");
    expect(status.isFullyActive).toBe(true);
  });

  it("suspended membership without pending invite", () => {
    const status = resolvePersonAccessStatus({
      pendingInvitation: false,
      membershipIsActive: false,
      userIsActive: true,
    });
    expect(status.primaryLabel).toBe("Zugriff gesperrt");
  });
});
