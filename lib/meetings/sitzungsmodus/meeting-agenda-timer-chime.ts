/**
 * Optional agenda timer audio. Failures must never break the timer.
 */

let audioContext: AudioContext | null = null;
let activeStopHandles: Array<() => void> = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioContext) audioContext = new Ctx();
    return audioContext;
  } catch {
    return null;
  }
}

function scheduleTone(freqHz: number, durationSec: number, peakGain = 0.08): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freqHz;
    gain.gain.value = peakGain;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime;
    osc.start(start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
    osc.stop(start + durationSec + 0.02);

    const stop = () => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.stop();
      } catch {
        /* already stopped */
      }
    };
    activeStopHandles.push(stop);
    osc.onended = () => {
      activeStopHandles = activeStopHandles.filter((h) => h !== stop);
    };
  } catch {
    // Browser autoplay policy or missing audio — ignore.
  }
}

export function stopMeetingAgendaTimerAudio(): void {
  const handles = [...activeStopHandles];
  activeStopHandles = [];
  for (const stop of handles) stop();
}

/** Short per-second countdown tick (10→1). */
export function playMeetingAgendaTimerCountdownCue(): void {
  scheduleTone(880, 0.12, 0.07);
}

/** Distinct double-tone when planned time reaches zero. */
export function playMeetingAgendaTimerCompletionCue(): void {
  scheduleTone(523.25, 0.22, 0.09);
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    window.setTimeout(() => scheduleTone(659.25, 0.28, 0.09), 120);
  } catch {
    /* ignore */
  }
}

/** @deprecated Use playMeetingAgendaTimerCountdownCue */
export function playMeetingAgendaTimerChime(): void {
  playMeetingAgendaTimerCountdownCue();
}