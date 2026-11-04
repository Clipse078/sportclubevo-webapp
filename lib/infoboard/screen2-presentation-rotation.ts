/**
 * SCE-INFOBOARD-V2-01-R21 — deterministic Screen 2 center presentation rotation.
 */

export type Screen2PresentationId = "anlageplan" | "ov";

export const SCREEN2_PRESENTATION_ANLAGEPLAN_MS = 25_000;
export const SCREEN2_PRESENTATION_OV_MS = 20_000;

export const SCREEN2_PRESENTATION_INITIAL: Screen2PresentationId = "anlageplan";

export function durationMsForScreen2Presentation(
  presentation: Screen2PresentationId,
): number {
  return presentation === "anlageplan"
    ? SCREEN2_PRESENTATION_ANLAGEPLAN_MS
    : SCREEN2_PRESENTATION_OV_MS;
}

export function nextScreen2Presentation(
  current: Screen2PresentationId,
): Screen2PresentationId {
  return current === "anlageplan" ? "ov" : "anlageplan";
}

/**
 * Advance through the rotation sequence according to elapsed wall time since
 * `cycleStartedAtMs`, assuming the cycle began on ANLAGEPLAN.
 */
export function resolveScreen2PresentationAtElapsedMs(
  elapsedMs: number,
): {
  readonly presentation: Screen2PresentationId;
  readonly enteredAtOffsetMs: number;
} {
  if (elapsedMs <= 0) {
    return { presentation: SCREEN2_PRESENTATION_INITIAL, enteredAtOffsetMs: 0 };
  }

  let remaining = elapsedMs;
  let presentation: Screen2PresentationId = SCREEN2_PRESENTATION_INITIAL;
  let enteredAtOffsetMs = 0;

  while (remaining > 0) {
    const duration = durationMsForScreen2Presentation(presentation);
    if (remaining < duration) {
      return { presentation, enteredAtOffsetMs };
    }
    remaining -= duration;
    enteredAtOffsetMs += duration;
    presentation = nextScreen2Presentation(presentation);
  }

  return { presentation, enteredAtOffsetMs };
}

/**
 * Catch up presentation state after hidden tab time or long pauses.
 */
export function catchUpScreen2Presentation(
  presentation: Screen2PresentationId,
  enteredAtMs: number,
  nowMs: number,
): {
  readonly presentation: Screen2PresentationId;
  readonly enteredAtMs: number;
} {
  let current = presentation;
  let entered = enteredAtMs;

  while (nowMs - entered >= durationMsForScreen2Presentation(current)) {
    entered += durationMsForScreen2Presentation(current);
    current = nextScreen2Presentation(current);
  }

  return { presentation: current, enteredAtMs: entered };
}
