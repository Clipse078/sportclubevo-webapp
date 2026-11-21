"use client";

import { useCallback, useRef } from "react";
import { exceedsUmsetzungsplanungTaskDragThreshold } from "@/lib/club-development/umsetzungsplanung-task-row-pointer";

type PointerStart = {
  x: number;
  y: number;
  pointerId: number;
};

export function useUmsetzungsplanungTaskRowPointerDrag() {
  const pendingRef = useRef<PointerStart | null>(null);
  const thresholdMetRef = useRef(false);
  const suppressClickRef = useRef(false);

  const resetPointerGesture = useCallback(() => {
    pendingRef.current = null;
    thresholdMetRef.current = false;
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    thresholdMetRef.current = false;
    suppressClickRef.current = false;
    pendingRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId || thresholdMetRef.current) return;
    if (exceedsUmsetzungsplanungTaskDragThreshold(pending.x, pending.y, event.clientX, event.clientY)) {
      thresholdMetRef.current = true;
    }
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent) => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    if (thresholdMetRef.current) {
      suppressClickRef.current = true;
    }
    resetPointerGesture();
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* ignore */
    }
  }, [resetPointerGesture]);

  const onPointerCancel = useCallback(
    (event: React.PointerEvent) => {
      resetPointerGesture();
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* ignore */
      }
    },
    [resetPointerGesture],
  );

  const shouldAllowDragStart = useCallback(() => thresholdMetRef.current, []);

  const onDragStartAfterThreshold = useCallback(() => {
    suppressClickRef.current = true;
    thresholdMetRef.current = false;
    pendingRef.current = null;
  }, []);

  const consumeSuppressClick = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    shouldAllowDragStart,
    onDragStartAfterThreshold,
    consumeSuppressClick,
    resetPointerGesture,
  };
}