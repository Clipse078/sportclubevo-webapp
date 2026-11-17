import { describe, expect, it, vi } from "vitest";
import {
  buildMeetingAgendaTimerPresentation,
  createMeetingAgendaTimerState,
  deriveMeetingAgendaTimerLifecycle,
  deriveRemainingSec,
  endSitzungsmodus,
  extendAgendaTimerOneMinute,
  goToNextAgendaTopic,
  pauseAgendaTimer,
  resetActiveAgendaTimer,
  resolveAgendaBudgetSec,
  resumeAgendaTimer,
  sanitizeTimerStateForAgendaItems,
  selectAgendaTopic,
  setChimeEnabled,
  shouldChimeAt60,
  shouldChimeAtZero,
  startAgendaTimer,
  startSitzungsmodus,
  markChimeMilestone,
  collectDueChimeMilestones,
  shouldChimeAtSecond,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting agenda timer engine", () => {
  it("starts from planned minutes", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 1000, 10);
    const budget = resolveAgendaBudgetSec({ plannedDurationMin: 10 })!;
    state = startAgendaTimer(state, 5000, budget);
    expect(state.phase).toBe("running");
    expect(state.budgetSec).toBe(600);
    expect(deriveRemainingSec(state, 5000)).toBe(600);
    expect(deriveRemainingSec(state, 65000)).toBe(540);
  });

  it("selecting a topic without starting is ready with full planned duration", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 5);
    expect(state.phase).toBe("idle");
    expect(state.budgetSec).toBe(300);
    expect(state.remainingAtAnchorSec).toBe(300);
    expect(state.activeTopicHasStarted).toBe(false);
    expect(deriveMeetingAgendaTimerLifecycle(state, 300)).toBe("ready");
    expect(buildMeetingAgendaTimerPresentation(300, "ready").kind).toBe("normal");
    expect(buildMeetingAgendaTimerPresentation(0, "none").kind).toBe("normal");
    expect(buildMeetingAgendaTimerPresentation(0, "none").display).toBe("—");
  });

  it("pause and resume preserve anchor math", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 5);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 120_000);
    expect(deriveRemainingSec(state, 120_000)).toBe(180);
    state = resumeAgendaTimer(state, 200_000);
    expect(deriveRemainingSec(state, 230_000)).toBe(150);
  });

  it("extend adds one minute without changing budget", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 5);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 0);
    state = extendAgendaTimerOneMinute(state, 0);
    expect(state.budgetSec).toBe(300);
    expect(state.remainingAtAnchorSec).toBe(360);
  });

  it("switching topics pauses and restores per-topic state", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 10);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 10 })!);
    state = pauseAgendaTimer(state, 300_000);
    state = goToNextAgendaTopic(state, ["a1", "a2"], 300_000, { a2: 5 });
    expect(state.activeAgendaItemId).toBe("a2");
    expect(state.phase).toBe("idle");
    expect(state.remainingAtAnchorSec).toBe(300);
    state = selectAgendaTopic(state, "a1", 300_000, 10);
    expect(state.remainingAtAnchorSec).toBe(300);
    expect(state.phase).toBe("paused");
  });

  it("does not auto-start next topic", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 1);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 1 })!);
    state = goToNextAgendaTopic(state, ["a1", "a2"], 0, { a2: 8 });
    expect(state.activeAgendaItemId).toBe("a2");
    expect(state.phase).toBe("idle");
    expect(deriveMeetingAgendaTimerLifecycle(state, state.remainingAtAnchorSec)).toBe("ready");
  });

  it("requires temporary duration when planned missing", () => {
    expect(resolveAgendaBudgetSec({ plannedDurationMin: null })).toBeNull();
    const temp = resolveAgendaBudgetSec({ plannedDurationMin: null, temporaryDurationMin: 7 });
    expect(temp?.budgetSec).toBe(420);
    expect(temp?.temporaryDurationSec).toBe(420);
  });

  it("presentation boundaries: 61, 60, 11, 10, 1, zero, overtime", () => {
    expect(buildMeetingAgendaTimerPresentation(61, "running", true).kind).toBe("normal");
    expect(buildMeetingAgendaTimerPresentation(60, "running", true).kind).toBe("warning");
    expect(buildMeetingAgendaTimerPresentation(11, "running", true).kind).toBe("warning");
    expect(buildMeetingAgendaTimerPresentation(10, "running", true).kind).toBe("final");
    expect(buildMeetingAgendaTimerPresentation(10, "running", true).label).toBe("Letzte Sekunden");
    expect(buildMeetingAgendaTimerPresentation(1, "running", true).kind).toBe("final");
    expect(buildMeetingAgendaTimerPresentation(0, "running", true).kind).toBe("expired");
    expect(buildMeetingAgendaTimerPresentation(-84, "expired", true).display).toBe("+01:24");
    expect(buildMeetingAgendaTimerPresentation(300, "ready", false).kind).toBe("normal");
    expect(buildMeetingAgendaTimerPresentation(30, "ready", false).kind).toBe("normal");
  });

  it("chime milestones at each second 10→0 with deduplication and pause guard", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = setChimeEnabled(state, true);
    state = selectAgendaTopic(state, "a1", 0, 2);
    expect(shouldChimeAtSecond(state, 10, 10)).toBe(false);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 2 })!);
    expect(shouldChimeAtSecond(state, 10, 10)).toBe(true);
    state = markChimeMilestone(state, 10);
    expect(shouldChimeAtSecond(state, 10, 10)).toBe(false);
    expect(collectDueChimeMilestones(state, 9.8, 10)).toEqual([9]);
    expect(collectDueChimeMilestones(state, 3.2, 11)).toEqual([3]);
    state = markChimeMilestone(state, 3);
    expect(shouldChimeAtSecond(state, 0, 0)).toBe(true);
    state = pauseAgendaTimer(state, 0);
    expect(shouldChimeAtSecond(state, 0, 0)).toBe(false);
    expect(collectDueChimeMilestones(state, 0, 0)).toEqual([]);
  });

  it("short ready topics stay neutral until started", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, null);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ temporaryDurationMin: 1 })!);
    const remaining = deriveRemainingSec(state, 0);
    expect(buildMeetingAgendaTimerPresentation(remaining, "running", true).kind).toBe("warning");
    state = resetActiveAgendaTimer(state);
    expect(buildMeetingAgendaTimerPresentation(state.remainingAtAnchorSec, "ready", false).kind).toBe(
      "normal",
    );
  });

  it("+1 minute clears finishing chime milestones", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 1);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 1 })!);
    state = markChimeMilestone(state, 10);
    state = pauseAgendaTimer(state, 0);
    state = { ...state, remainingAtAnchorSec: 5, activeAgendaItemId: "a1" };
    state = extendAgendaTimerOneMinute(state, 0);
    expect(state.chimedMilestonesByTopicId.a1 ?? []).not.toContain(10);
  });

  it("reset restores budget elapsed only after confirm flow sets idle", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 5);
    state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 5 })!);
    state = pauseAgendaTimer(state, 240_000);
    state = resetActiveAgendaTimer(state);
    expect(state.remainingAtAnchorSec).toBe(300);
    expect(state.phase).toBe("idle");
    expect(state.activeTopicHasStarted).toBe(false);
  });

  it("invalid restored topic returns to neutral selection", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = {
      ...startSitzungsmodus(state),
      activeAgendaItemId: "removed",
      phase: "paused",
      remainingAtAnchorSec: -30,
      activeTopicHasStarted: true,
    };
    state = sanitizeTimerStateForAgendaItems(state, new Set(["a1"]));
    expect(state.activeAgendaItemId).toBeNull();
    expect(state.phase).toBe("idle");
    expect(state.remainingAtAnchorSec).toBe(0);
    expect(state.activeTopicHasStarted).toBe(false);
    expect(deriveMeetingAgendaTimerLifecycle(state, 0)).toBe("none");
  });

  it("end mode pauses running timer and keeps resumable state", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    state = selectAgendaTopic(state, "a1", 0, 10);
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
      state = selectAgendaTopic(state, "a1", 0, 10);
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