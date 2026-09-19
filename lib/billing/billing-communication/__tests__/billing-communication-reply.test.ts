import { describe, expect, it } from "vitest";
import {
  buildEmailThreadingHeaders,
  buildReplySubject,
  canReplyToCommunication,
  collectInternalBillingEmailAddresses,
  deriveReplyRecipient,
} from "../billing-communication-reply";

describe("billing-communication-reply", () => {
  const internal = collectInternalBillingEmailAddresses({
    fromAddress: "SportClubEvo Billing <billing@sportclubevo.com>",
    replyToAddress: "billing@sportclubevo.com",
  });

  it("builds Re: subject without duplicate prefix", () => {
    expect(buildReplySubject("Rechnung 2026-1")).toBe("Re: Rechnung 2026-1");
    expect(buildReplySubject("Re: Rechnung 2026-1")).toBe("Re: Rechnung 2026-1");
    expect(buildReplySubject("RE: Test")).toBe("RE: Test");
  });

  it("derives inbound reply recipient from sender", () => {
    const recipient = deriveReplyRecipient(
      {
        direction: "INBOUND",
        fromAddress: "kunde@example.test",
        toAddresses: ["billing@sportclubevo.com"],
        ccAddresses: [],
      },
      internal,
    );
    expect(recipient).toBe("kunde@example.test");
  });

  it("derives outbound reply recipient from external to address", () => {
    const recipient = deriveReplyRecipient(
      {
        direction: "OUTBOUND",
        fromAddress: "billing@sportclubevo.com",
        toAddresses: ["finanzen@example.test"],
        ccAddresses: [],
      },
      internal,
    );
    expect(recipient).toBe("finanzen@example.test");
  });

  it("does not reply to platform billing address", () => {
    expect(
      canReplyToCommunication(
        {
          direction: "INBOUND",
          fromAddress: "billing@sportclubevo.com",
          toAddresses: ["hello@tulip-digital.ch"],
          ccAddresses: [],
        },
        internal,
      ),
    ).toBe(false);
  });

  it("builds threading headers from parent internet message id", () => {
    expect(
      buildEmailThreadingHeaders({
        internetMessageId: "<msg-a@test>",
        referencesHeader: "<msg-root@test>",
      }),
    ).toEqual({
      inReplyTo: "<msg-a@test>",
      referencesHeader: "<msg-root@test> <msg-a@test>",
    });
  });
});
