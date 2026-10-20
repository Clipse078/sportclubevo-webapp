import { describe, expect, it } from "vitest";
import { buildEmailSenderReadinessPresentation } from "@/lib/communication/email-sender-display";
import {
  mapEmailSenderReadinessHeadlineTone,
  mapEmailSenderReadinessToPanelRows,
} from "@/lib/communication/email-sender-readiness-panel";
import type { PlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";
import type { TenantEmailSenderSettings } from "@/lib/communication/email-sender-service";

const readiness: PlatformEmailReadiness = {
  ready: true,
  transportConfigured: true,
  senderConfigured: true,
  fromAddressValid: true,
  platformFallbackActive: false,
  reasons: [],
};

const settings: TenantEmailSenderSettings = {
  displayName: "Club",
  emailAddress: "info@club.test",
  activeFrom: "Club <info@club.test>",
  activeSource: "TENANT",
  platformFallbackActive: false,
  providerStatus: "VERIFIED",
};

describe("email-sender-readiness-panel", () => {
  it("maps checklist items to canonical readiness rows", () => {
    const presentation = buildEmailSenderReadinessPresentation(readiness, settings);
    const rows = mapEmailSenderReadinessToPanelRows(presentation);
    expect(rows.length).toBeGreaterThan(2);
    expect(rows[0]?.stateLabel).toBeTruthy();
    expect(mapEmailSenderReadinessHeadlineTone(presentation)).toBe("SUCCESS");
  });
});
