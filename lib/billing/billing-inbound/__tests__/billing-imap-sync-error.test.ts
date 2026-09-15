import { describe, expect, it } from "vitest";
import { formatBillingImapSyncError } from "../billing-imap-sync-error";

describe("formatBillingImapSyncError", () => {
  it("includes safe IMAP metadata without secrets", () => {
    const error = new Error("Command failed") as Error & {
      responseStatus?: string;
      responseText?: string;
      command?: string;
    };
    error.responseStatus = "NO";
    error.responseText = "Invalid messageset";
    error.command = "UID FETCH";

    expect(formatBillingImapSyncError(error)).toBe(
      "IMAP UID FETCH failed: NO Invalid messageset",
    );
  });

  it("redacts password fragments from generic errors", () => {
    const error = new Error("Authentication failed for pass=secret");
    expect(formatBillingImapSyncError(error)).toBe("Authentication failed for [redacted]");
  });
});
