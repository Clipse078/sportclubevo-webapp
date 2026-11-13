import { describe, expect, it } from "vitest";
import { sanitizeMeetingAgendaNotesForDisplay } from "@/lib/meetings/meeting-agenda-notes-sanitize";

describe("sanitizeMeetingAgendaNotesForDisplay", () => {
  it("removes pendenz-ref technical markers from protocol-facing notes", () => {
    const raw = "[pendenz-ref:MeetingAction/abc]\nUrsprung: Frühere Sitzung\nFreitext.";
    expect(sanitizeMeetingAgendaNotesForDisplay(raw)).toBe("Ursprung: Frühere Sitzung\nFreitext.");
  });

  it("returns null when only technical content remains", () => {
    expect(sanitizeMeetingAgendaNotesForDisplay("[pendenz-ref:MeetingAction/x]")).toBeNull();
  });
});
