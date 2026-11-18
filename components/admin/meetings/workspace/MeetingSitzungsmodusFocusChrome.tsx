"use client";

import { useEffect } from "react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MEETING_SITZUNGSMODUS_FOCUS_DOM_ATTR } from "@/lib/meetings/sitzungsmodus/meeting-sitzungsmodus-focus-presentation";

/** Toggles authenticated shell nav visibility while page-wide Sitzungsmodus focus is active. */
export function MeetingSitzungsmodusFocusChrome() {
  const timer = useMeetingAgendaTimer();
  const active = Boolean(timer?.focusPresentationActive && timer.state.modeActive);

  useEffect(() => {
    const root = document.documentElement;
    if (active) root.setAttribute(MEETING_SITZUNGSMODUS_FOCUS_DOM_ATTR, "");
    else root.removeAttribute(MEETING_SITZUNGSMODUS_FOCUS_DOM_ATTR);
    return () => root.removeAttribute(MEETING_SITZUNGSMODUS_FOCUS_DOM_ATTR);
  }, [active]);

  return null;
}