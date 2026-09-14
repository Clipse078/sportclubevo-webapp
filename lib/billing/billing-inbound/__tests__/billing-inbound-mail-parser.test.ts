import { describe, expect, it } from "vitest";
import { parseInboundBillingEmailSource } from "../billing-inbound-mail-parser";

const sampleMime = [
  "From: Customer <customer@club.test>",
  "To: billing@sportclubevo.com",
  "Cc: cc@club.test",
  "Subject: Re: Invoice 2026-000003",
  "Message-ID: <inbound-1@club.test>",
  "In-Reply-To: <outbound-1@sportclubevo.com>",
  "References: <outbound-1@sportclubevo.com>",
  "Date: Sun, 14 Sep 2026 12:00:00 +0000",
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Thanks for the invoice.",
].join("\r\n");

describe("billing inbound mail parser", () => {
  it("parses core headers and bodies from MIME", async () => {
    const parsed = await parseInboundBillingEmailSource(Buffer.from(sampleMime));
    expect(parsed.senderAddress).toBe("customer@club.test");
    expect(parsed.toAddresses).toContain("billing@sportclubevo.com");
    expect(parsed.ccAddresses).toContain("cc@club.test");
    expect(parsed.subject).toContain("2026-000003");
    expect(parsed.textBody).toContain("Thanks");
    expect(parsed.internetMessageId).toBe("inbound-1@club.test");
    expect(parsed.inReplyTo).toBe("outbound-1@sportclubevo.com");
  });
});
