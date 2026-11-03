"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SCREEN2_PRESENTATION_INITIAL,
  catchUpScreen2Presentation,
  durationMsForScreen2Presentation,
  nextScreen2Presentation,
  type Screen2PresentationId,
} from "@/lib/infoboard/screen2-presentation-rotation";

export type UseScreen2PresentationRotationOptions = {
  /** Preview-only: disable automatic advancement. */
  autoRotate?: boolean;
  /**
   * Identity that may restart the cycle (tenant/board). Transport feed refreshes
   * must not be included here.
   */
  sessionKey?: string;
};

export type UseScreen2PresentationRotationResult = {
  presentation: Screen2PresentationId;
};

export function useScreen2PresentationRotation({
  autoRotate = true,
  sessionKey = "stable",
}: UseScreen2PresentationRotationOptions = {}): UseScreen2PresentationRotationResult {
  const [presentation, setPresentation] = useState<Screen2PresentationId>(
    SCREEN2_PRESENTATION_INITIAL,
  );
  const presentationRef = useRef<Screen2PresentationId>(SCREEN2_PRESENTATION_INITIAL);
  const enteredAtRef = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledAdvance = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleAdvance = useCallback(() => {
    clearScheduledAdvance();
    if (!autoRotate) {
      return;
    }

    const duration = durationMsForScreen2Presentation(presentationRef.current);
    const elapsed = Date.now() - enteredAtRef.current;
    const remaining = Math.max(0, duration - elapsed);

    timeoutRef.current = setTimeout(() => {
      const next = nextScreen2Presentation(presentationRef.current);
      presentationRef.current = next;
      enteredAtRef.current = Date.now();
      setPresentation(next);
    }, remaining);
  }, [autoRotate, clearScheduledAdvance]);

  useEffect(() => {
    presentationRef.current = SCREEN2_PRESENTATION_INITIAL;
    enteredAtRef.current = Date.now();
    setPresentation(SCREEN2_PRESENTATION_INITIAL);
  }, [sessionKey]);

  useEffect(() => {
    presentationRef.current = presentation;
    scheduleAdvance();
    return clearScheduledAdvance;
  }, [presentation, scheduleAdvance, clearScheduledAdvance]);

  useEffect(() => {
    if (!autoRotate) {
      return undefined;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearScheduledAdvance();
        return;
      }

      const caughtUp = catchUpScreen2Presentation(
        presentationRef.current,
        enteredAtRef.current,
        Date.now(),
      );
      if (caughtUp.presentation !== presentationRef.current) {
        presentationRef.current = caughtUp.presentation;
        setPresentation(caughtUp.presentation);
      }
      enteredAtRef.current = caughtUp.enteredAtMs;
      scheduleAdvance();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [autoRotate, clearScheduledAdvance, scheduleAdvance]);

  return { presentation };
}
