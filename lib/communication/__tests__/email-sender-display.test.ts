import { describe, expect, it } from "vitest";
import {
  buildEmailSenderReadinessPresentation,
  buildEmailSenderReplyToPresentation,
  parseFormattedEmailFrom,
} from "@/lib/communication/email-sender-display";

describe("email-sender-display", () => {
  it("parses formatted From identities", () => {
    expect(parseFormattedEmailFrom("FC Allschwil <info@club.ch>")).toEqual({
      displayName: "FC Allschwil",
      emailAddress: "info@club.ch",
    });
  });

  it("maps ready tenant sender to Bereit", () => {
    const settings = {
      displayName: "Club",
      emailAddress: "a@b.ch",
      providerStatus: "VERIFIED" as const,
      activeSource: "TENANT" as const,
      activeFrom: "Club <a@b.ch>",
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
      reasons: [],
    };
    expect(buildEmailSenderReadinessPresentation(readiness, settings).headline).toBe("Bereit");
  });

  it("maps transport missing to Provider nicht konfiguriert", () => {
    const settings = {
      displayName: null,
      emailAddress: null,
      providerStatus: "NOT_CONFIGURED" as const,
      activeSource: "PLATFORM" as const,
      activeFrom: "SportClubEvo <noreply@mail.sportclubevo.com>",
      platformFallbackActive: true,
    };
    const readiness = {
      ready: false,
      senderConfigured: false,
      transportConfigured: false,
      fromAddressValid: true,
      activeSource: "PLATFORM" as const,
      providerStatus: "NOT_CONFIGURED" as const,
      platformFallbackActive: true,
      reasons: ["TRANSPORT_NOT_CONFIGURED"],
    };
    expect(buildEmailSenderReadinessPresentation(readiness, settings).headline).toBe(
      "Provider nicht konfiguriert",
    );
  });

  it("builds Reply-To presentation without secret tokens", () => {
    const presentation = buildEmailSenderReplyToPresentation({
      effectiveFrom: "Club <mail@club.ch>",
      inboundReplyRoutingConfigured: true,
    });
    expect(presentation.fromEmailAddress).toBe("mail@club.ch");
    expect(presentation.replyToBody).toMatch(/Kommunikationscenter/);
    expect(JSON.stringify(presentation)).not.toMatch(/RESEND|reply\+/i);
  });
});
