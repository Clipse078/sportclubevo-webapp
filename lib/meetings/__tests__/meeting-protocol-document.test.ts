import { describe, expect, it } from "vitest";
import { buildMeetingProtocolDocument } from "@/lib/meetings/meeting-protocol-document";
import { decodeMeetingLocationForProtocol } from "@/lib/meetings/meeting-protocol-location";
import {
  completedMeetingProtocolFixture,
  locationWithSecretFixture,
  missingLogoFixture,
  plannedMeetingProtocolFixture,
} from "@/lib/meetings/__tests__/fixtures/meeting-protocol-fixtures";

describe("buildMeetingProtocolDocument (SCE-CD-03R4)", () => {
  it("maps tenant branding, attendance groups and agenda detail", () => {
    const model = buildMeetingProtocolDocument(completedMeetingProtocolFixture);

    expect(model.tenantName).toBe("Demo Sportclub");
    expect(model.documentLabel).toBe("Sitzungsprotokoll");
    expect(model.attendanceGroups.map((g) => g.heading)).toEqual([
      "Anwesend",
      "Entschuldigt",
      "Abwesend",
      "Teilnahme noch nicht bestätigt",
    ]);
    expect(model.agendaItems[1]?.backgroundText).toContain("Budgetplanung");
    expect(model.agendaItems[1]?.protocolNotes).toContain("Diskussion");
    expect(model.agendaItems[1]?.decisions[0]?.rationale).toBe("Finanzen sind tragfähig.");
    expect(model.unlinkedActions).toHaveLength(1);
    expect(model.actionOverviewTable).toHaveLength(2);
  });

  it("shows planned-meeting draft banner without implying approval", () => {
    const model = buildMeetingProtocolDocument(plannedMeetingProtocolFixture);
    expect(model.draftBanner).toMatch(/ENTWURF/);
    expect(model.draftBanner).toMatch(/noch nicht durchgeführt/);
    expect(model.agendaItems).toHaveLength(2);
    expect(model.unlinkedDecisions).toHaveLength(0);
  });

  it("uses text fallback when tenant logo is missing", () => {
    const model = buildMeetingProtocolDocument(missingLogoFixture);
    expect(model.tenantLogoUrl).toBeNull();
    expect(model.tenantName).toBe("Demo Sportclub");
  });

  it("redacts conferencing secrets in meeting location metadata", () => {
    const model = buildMeetingProtocolDocument(locationWithSecretFixture);
    const ort = model.metadataRows.find((row) => row.label === "Ort");
    expect(ort?.value).not.toContain("supersecret");
    expect(ort?.value).toContain("ausgeblendet");
  });

  it("never exposes raw participant enum codes in output", () => {
    const model = buildMeetingProtocolDocument(completedMeetingProtocolFixture);
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain("PRESENT");
    expect(serialized).not.toContain("INVITED");
  });
});

describe("decodeMeetingLocationForProtocol", () => {
  it("strips codec prefixes and URL secrets", () => {
    const value = decodeMeetingLocationForProtocol(
      "@sce:venue:Clubhaus https://zoom.example/j/1?pwd=hidden",
    );
    expect(value).not.toContain("@sce:");
    expect(value).toContain("ausgeblendet");
    expect(value).not.toContain("hidden");
  });
});
