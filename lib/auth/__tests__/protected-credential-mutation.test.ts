import { describe, expect, it } from "vitest";
import {
  assertProtectedCredentialMutationAllowed,
  isProtectedCredentialUpdateBlocked,
} from "@/lib/auth/protected-credential-mutation";

describe("protected credential mutation", () => {
  it("blocks automated hash update for it@fcallschwil.ch", () => {
    expect(isProtectedCredentialUpdateBlocked("it@fcallschwil.ch")).toBe(true);
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: false,
        context: "automated",
      }),
    ).toThrow(/protected identity/i);
  });

  it("allows USER_CHANGE intent in interactive context for protected identity", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: false,
        context: "interactive",
        intent: "USER_CHANGE",
      }),
    ).not.toThrow();
  });

  it("blocks ADMIN_RESET for protected identity", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: false,
        context: "automated",
        intent: "ADMIN_RESET",
      }),
    ).toThrow(/protected identity/i);
  });

  it("allows EMERGENCY_RECOVERY for protected identity", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: false,
        context: "automated",
        intent: "EMERGENCY_RECOVERY",
      }),
    ).not.toThrow();
  });

  it("allows automated create for protected identity when genuinely absent", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: true,
        context: "automated",
      }),
    ).not.toThrow();
  });
});
