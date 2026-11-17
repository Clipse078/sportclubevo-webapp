import { describe, expect, it } from "vitest";
import {
  buildSeriesOccurrenceKey,
} from "@/lib/tasks/recurrence-dates";
import {
  buildMeetingDecisionTaskOccurrenceKey,
  buildTraktandumTaskOccurrenceKey,
  isMeetingBridgeOccurrenceKey,
} from "@/lib/meetings/meeting-traktandum-task-link";

describe("meeting bridge occurrence keys", () => {
  it("uses a dedicated namespace distinct from TaskSeries occurrence keys", () => {
    const seriesKey = buildSeriesOccurrenceKey("series-1", "2026-09-21");
    const traktandumKey = buildTraktandumTaskOccurrenceKey("agenda-1", "req-1");
    const decisionKey = buildMeetingDecisionTaskOccurrenceKey("decision-1", "req-1");
    expect(isMeetingBridgeOccurrenceKey(seriesKey)).toBe(false);
    expect(isMeetingBridgeOccurrenceKey(traktandumKey)).toBe(true);
    expect(isMeetingBridgeOccurrenceKey(decisionKey)).toBe(true);
    expect(traktandumKey.startsWith("sce-mtg-traktandum-task:v1:")).toBe(true);
    expect(decisionKey.startsWith("sce-mtg-decision-task:v1:")).toBe(true);
  });
});