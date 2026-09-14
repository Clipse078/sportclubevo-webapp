import { describe, expect, it } from "vitest";
import {
  collectThreadCandidateMessageIds,
  normalizeInternetMessageId,
  parseReferencesHeader,
} from "../billing-inbound-message-id";

describe("billing inbound message-id helpers", () => {
  it("normalizes angle-bracket Message-IDs", () => {
    expect(normalizeInternetMessageId("<abc@example.com>")).toBe("abc@example.com");
  });

  it("collects thread candidates from In-Reply-To and References", () => {
    const ids = collectThreadCandidateMessageIds({
      inReplyTo: "<outbound@example.com>",
      referencesHeader: "<first@example.com> <outbound@example.com>",
    });
    expect(ids).toContain("outbound@example.com");
    expect(ids).toContain("<outbound@example.com>");
  });

  it("parses References header tokens", () => {
    expect(parseReferencesHeader("<a@test> <b@test>")).toEqual(["a@test", "b@test"]);
  });
});
