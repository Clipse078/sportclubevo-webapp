"use client";

import { useEffect, useRef } from "react";
import { UMSETZUNGSPLANUNG_SCHEDULE_DROP_DWELL_MS } from "@/lib/club-development/umsetzungsplanung-schedule-drop";

export function useUmsetzungsplanungScheduleDropDwell(
  active: boolean,
  onDwellComplete: () => void,
  dwellMs: number = UMSETZUNGSPLANUNG_SCHEDULE_DROP_DWELL_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onDwellComplete);
  onCompleteRef.current = onDwellComplete;

  useEffect(() => {
    if (!active) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onCompleteRef.current();
    }, dwellMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, dwellMs]);
}