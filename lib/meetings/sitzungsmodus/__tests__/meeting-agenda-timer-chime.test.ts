import { describe, expect, it, vi } from "vitest";
import {
  playMeetingAgendaTimerCompletionCue,
  playMeetingAgendaTimerCountdownCue,
  stopMeetingAgendaTimerAudio,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-chime";

describe("meeting agenda timer chime audio controller", () => {
  it("does not throw when Web Audio is unavailable", () => {
    const prior = globalThis.window;
    // @ts-expect-error test shim
    delete globalThis.window;
    expect(() => {
      playMeetingAgendaTimerCountdownCue();
      playMeetingAgendaTimerCompletionCue();
      stopMeetingAgendaTimerAudio();
    }).not.toThrow();
    globalThis.window = prior;
  });

  it("tolerates autoplay failures", () => {
    const mockCtx = {
      resume: vi.fn().mockRejectedValue(new Error("denied")),
      currentTime: 0,
      createOscillator: vi.fn(() => {
        throw new Error("blocked");
      }),
      createGain: vi.fn(),
      destination: {},
    };
    class MockAudioContext {
      resume = mockCtx.resume;
      currentTime = 0;
      createOscillator = mockCtx.createOscillator;
      createGain = mockCtx.createGain;
      destination = mockCtx.destination;
    }
    vi.stubGlobal("window", { AudioContext: MockAudioContext });
    expect(() => playMeetingAgendaTimerCountdownCue()).not.toThrow();
    vi.unstubAllGlobals();
  });
});