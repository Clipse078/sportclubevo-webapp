import { describe, expect, it } from "vitest";
import {
  formatMeetingLocationDisplay,
  formatMeetingLocationPrint,
  formatMeetingPresenceLabel,
  parseMeetingLocation,
  serializeMeetingLocation,
  validateMeetingOnlineUrl,
} from "../meeting-presence-location";

describe("SCE-MTG-ONLINE-01 meeting presence location codec", () => {
  it("round-trips onsite locations unchanged", () => {
    const fields = { format: "ONSITE" as const, onsiteLabel: "Im Brüel", onlineUrl: null };
    expect(serializeMeetingLocation(fields)).toBe("Im Brüel");
    expect(parseMeetingLocation("Im Brüel")).toEqual(fields);
  });

  it("stores online meetings as https url in location", () => {
    const url = "https://meet.example.com/room";
    expect(validateMeetingOnlineUrl(url)).toBe(true);
    const fields = { format: "ONLINE" as const, onsiteLabel: null, onlineUrl: url };
    expect(serializeMeetingLocation(fields)).toBe(url);
    expect(parseMeetingLocation(url)).toEqual(fields);
  });

  it("serializes hybrid with marker payload", () => {
    const fields = {
      format: "HYBRID" as const,
      onsiteLabel: "Sekretariat",
      onlineUrl: "https://teams.microsoft.com/l/meetup",
    };
    const stored = serializeMeetingLocation(fields);
    expect(stored).toContain("[[sce-mtg-presence:v1]]");
    expect(parseMeetingLocation(stored)).toEqual(fields);
    expect(formatMeetingPresenceLabel(fields)).toContain("Hybrid");
    expect(formatMeetingLocationDisplay(stored)).toContain("Hybrid");
    const printed = formatMeetingLocationPrint(stored);
    expect(printed).toContain("teams.microsoft.com");
  });

  it("prints plain onsite without marker leakage", () => {
    expect(formatMeetingLocationDisplay("Sitzungszimmer")).toBe("Sitzungszimmer");
    expect(formatMeetingLocationPrint("Sitzungszimmer")).toBe("Sitzungszimmer");
  });
});
