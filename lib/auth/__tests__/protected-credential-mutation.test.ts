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

  it("allows interactive context for protected identity", () => {
    expect(() =>
      assertProtectedCredentialMutationAllowed("it@fcallschwil.ch", {
        isCreate: false,
        context: "interactive",
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
