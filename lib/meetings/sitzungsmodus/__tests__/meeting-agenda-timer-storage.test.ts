import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildMeetingAgendaTimerStorageKey,
  loadMeetingAgendaTimerState,
  saveMeetingAgendaTimerState,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-storage";
import { startSitzungsmodus, createMeetingAgendaTimerState } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting agenda timer storage", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  it("scopes storage by user, tenant and meeting", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = startSitzungsmodus(state);
    saveMeetingAgendaTimerState(state);
    const other = loadMeetingAgendaTimerState(
      { meetingId: "m2", tenantId: "t1", userId: "u1" },
      new Set(),
    );
    expect(other.modeActive).toBe(false);
    const loaded = loadMeetingAgendaTimerState(SCOPE, new Set());
    expect(loaded.modeActive).toBe(true);
    expect(buildMeetingAgendaTimerStorageKey(SCOPE)).toContain("m1");
  });

  it("drops snapshots for removed agenda items", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = {
      ...state,
      topicSnapshots: { gone: { remainingSec: 10, phase: "paused", budgetSec: 60, temporaryDurationSec: null } },
    };
    saveMeetingAgendaTimerState(state);
    const loaded = loadMeetingAgendaTimerState(SCOPE, new Set(["a1"]));
    expect(loaded.topicSnapshots.gone).toBeUndefined();
  });
});