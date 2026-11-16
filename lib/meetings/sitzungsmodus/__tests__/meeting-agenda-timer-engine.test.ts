import { describe, expect, it, vi } from "vitest";
import {
  buildMeetingAgendaTimerPresentation,
  createMeetingAgendaTimerState,
  deriveRemainingSec,
  endSitzungsmodus,
  extendAgendaTimerOneMinute,
  goToNextAgendaTopic,
  pauseAgendaTimer,
  resetActiveAgendaTimer,
  resolveAgendaBudgetSec,
  resumeAgendaTimer,
  selectAgendaTopic,
  setChimeEnabled,
  shouldChimeAt60,
  shouldChimeAtZero,
  startAgendaTimer,
  startSitzungsmodus,
  markChimeMilestone,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting agenda timer engine", () => {
  it("starts from planned minutes", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 1000);
    const budget = resolveAgendaBudgetSec({ plannedDurationMin: 10 })!;
    state = startAgendaTimer(state, 5000, budget);
    expect(state.phase).toBe("running");
    expect(state.budgetSec).toBe(600);
    expect(deriveRemainingSec(state, 5000)).toBe(600);
    expect(deriveRemainingSec(state, 65000)).toBe(540);
  });

  it("pause and resume preserve anchor math", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 120_000);
    expect(deriveRemainingSec(state, 120_000)).toBe(180);
    state = resumeAgendaTimer(state, 200_000);
    expect(deriveRemainingSec(state, 230_000)).toBe(150);
  });

  it("extend adds one minute without changing budget", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 0);
    state = extendAgendaTimerOneMinute(state, 0);
    expect(state.budgetSec).toBe(300);
    expect(state.remainingAtAnchorSec).toBe(360);
  });

  it("switching topics pauses and restores per-topic state", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 10 })!);
    state = pauseAgendaTimer(state, 300_000);
    state = goToNextAgendaTopic(state, ["a1", "a2"], 300_000);
    expect(state.activeAgendaItemId).toBe("a2");
    expect(state.phase).toBe("idle");
    state = selectAgendaTopic(state, "a1", 300_000);
    expect(state.remainingAtAnchorSec).toBe(300);
    expect(state.phase).toBe("paused");
  });

  it("does not auto-start next topic", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 1 })!);
    state = goToNextAgendaTopic(state, ["a1", "a2"], 0);
    expect(state.activeAgendaItemId).toBe("a2");
    expect(state.phase).toBe("idle");
  });

  it("requires temporary duration when planned missing", () => {
    expect(resolveAgendaBudgetSec({ plannedDurationMin: null })).toBeNull();
    const temp = resolveAgendaBudgetSec({ plannedDurationMin: null, temporaryDurationMin: 7 });
    expect(temp?.budgetSec).toBe(420);
    expect(temp?.temporaryDurationSec).toBe(420);
  });

  it("presentation states for warning, zero, overtime", () => {
    expect(buildMeetingAgendaTimerPresentation(90).kind).toBe("normal");
    expect(buildMeetingAgendaTimerPresentation(45).kind).toBe("warning");
    expect(buildMeetingAgendaTimerPresentation(0).kind).toBe("expired");
    expect(buildMeetingAgendaTimerPresentation(-84).display).toBe("+01:24 überzogen");
  });

  it("chime deduplication per topic", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = setChimeEnabled(state, true);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 2 })!);
    expect(shouldChimeAt60(state, 55)).toBe(true);
    state = markChimeMilestone(state, "at60");
    expect(shouldChimeAt60(state, 55)).toBe(false);
    expect(shouldChimeAtZero(state, 0)).toBe(true);
    state = markChimeMilestone(state, "atZero");
    expect(shouldChimeAtZero(state, -1)).toBe(false);
  });

  it("topics starting at <=60s begin in warning band", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = setChimeEnabled(state, true);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ temporaryDurationMin: 1 })!);
    expect(buildMeetingAgendaTimerPresentation(deriveRemainingSec(state, 0)).kind).toBe("warning");
    expect(shouldChimeAt60(state, deriveRemainingSec(state, 0))).toBe(true);
  });

  it("reset restores budget elapsed only after confirm flow sets idle", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 240_000);
    state = resetActiveAgendaTimer(state);
    expect(state.remainingAtAnchorSec).toBe(300);
    expect(state.phase).toBe("idle");
  });

  it("end mode pauses running timer and keeps resumable state", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 10 })!);
    state = endSitzungsmodus(state, 60_000);
    expect(state.modeActive).toBe(false);
    expect(state.phase).toBe("paused");
    expect(state.remainingAtAnchorSec).toBe(540);
  });

  it("recovers after simulated background delay", () => {
    vi.useFakeTimers();
    try {
      let state = createMeetingAgendaTimerState(SCOPE);
      state = startSitzungsmodus(state);
      state = selectAgendaTopic(state, "a1", 0);
      const startMs = Date.now();
      state = startAgendaTimer(state, startMs, resolveAgendaBudgetSec({ plannedDurationMin: 10 })!);
      vi.advanceTimersByTime(120_000);
      const now = Date.now();
      expect(deriveRemainingSec(state, now)).toBe(480);
    } finally {
      vi.useRealTimers();
    }
  });
});