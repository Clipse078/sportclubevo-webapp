import { describe, expect, it } from "vitest";
import {
  formatBillingCommunicationDateTime,
  presentBillingCommunicationDirection,
  presentBillingCommunicationStatus,
} from "../billing-communication-presentation";

describe("billing communication presentation", () => {
  it("maps direction labels", () => {
    expect(presentBillingCommunicationDirection("OUTBOUND").label).toBe("Ausgehend");
    expect(presentBillingCommunicationDirection("INBOUND").isOutbound).toBe(false);
  });

  it("maps status labels to German operator copy", () => {
    expect(presentBillingCommunicationStatus("PENDING").label).toBe("Ausstehend");
    expect(presentBillingCommunicationStatus("SENT").label).toBe("Gesendet");
    expect(presentBillingCommunicationStatus("RECEIVED").label).toBe("Empfangen");
    expect(presentBillingCommunicationStatus("FAILED").label).toBe("Fehlgeschlagen");
  });

  it("formats timestamps for de-CH", () => {
    const formatted = formatBillingCommunicationDateTime("2026-09-14T19:41:00.000Z");
    expect(formatted).toMatch(/2026/);
    expect(formatted).not.toBe("—");
  });
});
