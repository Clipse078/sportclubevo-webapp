import { describe, expect, it } from "vitest";
import {
  mergeAgendaNotesAppend,
  normalizeAgendaNotesForCompare,
} from "@/lib/meetings/meeting-agenda-notes-append";

describe("meeting agenda notes append", () => {
  it("normalizes empty notes to null for compare", () => {
    expect(normalizeAgendaNotesForCompare("  ")).toBeNull();
    expect(normalizeAgendaNotesForCompare("Hallo")).toBe("Hallo");
  });

  it("merges append with paragraph break", () => {
    expect(mergeAgendaNotesAppend("Bestehend", "Neu")).toBe("Bestehend\n\nNeu");
    expect(mergeAgendaNotesAppend(null, "Neu")).toBe("Neu");
  });
});