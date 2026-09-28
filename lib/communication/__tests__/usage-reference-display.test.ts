import { describe, expect, it } from "vitest";
import {
  platformCommunicationUsageStatusLabel,
  zielgruppeUsageStatusLabel,
} from "@/lib/communication/usage-reference-display";

describe("usage-reference-display", () => {
  it("maps platform communication statuses for usage panels", () => {
    expect(platformCommunicationUsageStatusLabel("CAMPAIGN", "DRAFT")).toBe("Entwurf");
    expect(platformCommunicationUsageStatusLabel("CLUB_MESSAGE", "PUBLISHED")).toBe("Gesendet");
  });

  it("maps zielgruppe usage hints by kind", () => {
    expect(zielgruppeUsageStatusLabel("TEMPLATE", "ACTIVE")).toBe("Aktiv");
    expect(zielgruppeUsageStatusLabel("REQUIREMENT", "ACTIVE")).toBe("Aktiv");
    expect(zielgruppeUsageStatusLabel("CAMPAIGN", "READY")).toBe("Bereit");
  });
});
