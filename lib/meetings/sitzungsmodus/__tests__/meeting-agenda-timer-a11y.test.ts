import { describe, expect, it } from "vitest";
import { buildMeetingAgendaTimerPresentation } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";
import {
  buildTimerLiveRegionMessage,
  resolveTimerLiveRegionMilestone,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-a11y";

describe("meeting agenda timer a11y", () => {
  it("announces only milestone bands, not every second", () => {
    expect(resolveTimerLiveRegionMilestone(buildMeetingAgendaTimerPresentation(59, "running", true), "running", 59)).toBeNull();
    const at60 = buildMeetingAgendaTimerPresentation(60, "running", true);
    expect(resolveTimerLiveRegionMilestone(at60, "running", 60)).toBe("at60");
    const at10 = buildMeetingAgendaTimerPresentation(10, "running", true);
    expect(resolveTimerLiveRegionMilestone(at10, "running", 10)).toBe("at10");
    const expired = buildMeetingAgendaTimerPresentation(0, "expired", true);
    expect(resolveTimerLiveRegionMilestone(expired, "expired", 0)).toBe("expired");
  });

  it("builds German milestone messages", () => {
    const pres = buildMeetingAgendaTimerPresentation(10, "running", true);
    expect(buildTimerLiveRegionMessage(pres, "Finanzen", "running", "at10")).toContain("Letzte zehn Sekunden");
  });
});