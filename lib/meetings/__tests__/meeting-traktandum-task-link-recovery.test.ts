import { describe, expect, it } from "vitest";
import {
  buildMeetingDecisionTaskOccurrenceKey,
  buildTraktandumTaskOccurrenceKey,
  parseAgendaItemIdFromTraktandumTaskOccurrenceKey,
  parseClientRequestIdFromMeetingDecisionTaskOccurrenceKey,
  rehomeMeetingDecisionTaskOccurrenceKeyToTraktandum,
} from "@/lib/meetings/meeting-traktandum-task-link";

describe("meeting task bridge key recovery", () => {
  it("rehomes decision-task bridge keys onto traktandum bridge without changing client id", () => {
    const decisionKey = buildMeetingDecisionTaskOccurrenceKey("d1", "req-99");
    expect(parseClientRequestIdFromMeetingDecisionTaskOccurrenceKey(decisionKey)).toBe("req-99");

    const traktandumKey = rehomeMeetingDecisionTaskOccurrenceKeyToTraktandum("a1", decisionKey);
    expect(traktandumKey).toBe(buildTraktandumTaskOccurrenceKey("a1", "req-99"));
    expect(parseAgendaItemIdFromTraktandumTaskOccurrenceKey(traktandumKey)).toBe("a1");
  });

  it("leaves non-bridge keys untouched", () => {
    expect(rehomeMeetingDecisionTaskOccurrenceKeyToTraktandum("a1", null)).toBeNull();
    expect(rehomeMeetingDecisionTaskOccurrenceKeyToTraktandum("a1", "series:2026-01-01")).toBe(
      "series:2026-01-01",
    );
  });
});