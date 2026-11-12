import { describe, expect, it } from "vitest";
import {
  buildAgendaItemCollapsedMetadata,
  formatAgendaPlannedDurationMin,
} from "@/lib/meetings/agenda-item-presentation";

describe("agenda item collapsed presentation", () => {
  it("includes owner, duration and status when configured", () => {
    expect(
      buildAgendaItemCollapsedMetadata({
        owner: "Michael Duijster",
        ownerPersonId: "cm123",
        durationMin: 5,
        status: "OPEN",
      }),
    ).toEqual(["Michael Duijster", "5 Min.", "Offen"]);
  });

  it("omits owner and duration when not configured", () => {
    expect(
      buildAgendaItemCollapsedMetadata({
        owner: null,
        ownerPersonId: null,
        durationMin: null,
        status: "SKIPPED",
      }),
    ).toEqual(["Übersprungen"]);
  });

  it("never surfaces raw opaque person ids as owner labels", () => {
    const meta = buildAgendaItemCollapsedMetadata({
      owner: "cmabcdefghij1234567890",
      ownerPersonId: "cmabcdefghij1234567890",
      durationMin: null,
      status: "OPEN",
    });
    expect(meta[0]).toMatch(/^Person \(cmabcdef/);
    expect(meta[0]).not.toBe("cmabcdefghij1234567890");
  });

  it("formats planned duration in minutes", () => {
    expect(formatAgendaPlannedDurationMin(5)).toBe("5 Min.");
    expect(formatAgendaPlannedDurationMin(null)).toBeNull();
    expect(formatAgendaPlannedDurationMin(0)).toBeNull();
  });
});
