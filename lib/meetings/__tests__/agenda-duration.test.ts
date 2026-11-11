import { describe, expect, it } from "vitest";
import {
  agendaExceedsMeetingPlannedTime,
  normalizeAgendaDurationMin,
  sumAgendaPlannedMinutes,
} from "@/lib/meetings/agenda-duration";

describe("agenda duration helpers", () => {
  it("sums positive agenda durations only", () => {
    expect(sumAgendaPlannedMinutes([{ durationMin: 15 }, { durationMin: null }, { durationMin: 10 }])).toBe(25);
  });

  it("warns when agenda exceeds meeting planned duration", () => {
    expect(agendaExceedsMeetingPlannedTime({ agendaTotalMin: 95, meetingPlannedDurationMin: 90 })).toBe(true);
    expect(agendaExceedsMeetingPlannedTime({ agendaTotalMin: 60, meetingPlannedDurationMin: null })).toBe(false);
  });

  it("normalizes custom durations", () => {
    expect(normalizeAgendaDurationMin("45")).toBe(45);
    expect(normalizeAgendaDurationMin(0)).toBe(null);
    expect(normalizeAgendaDurationMin("")).toBe(null);
  });
});
