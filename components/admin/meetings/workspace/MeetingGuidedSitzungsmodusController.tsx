"use client";

import { useEffect } from "react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import {
  MEETING_GUIDED_SITZUNGSMODUS_EVENT,
  type MeetingGuidedSitzungsmodusEventDetail,
} from "@/lib/meetings/sitzungsmodus/meeting-guided-sitzungsmodus";
import type { MeetingWorkspaceTabId } from "@/lib/nav/meeting-workspace-tab-config";

/**
 * Wires summary-header entry to Traktanden + Sitzungsmodus focus (no timer / lifecycle).
 */
export function MeetingGuidedSitzungsmodusController() {
  const timer = useMeetingAgendaTimer();

  useEffect(() => {
    if (!timer) return;

    function onEnter(event: Event) {
      if (!timer) return;
      const ctx = timer;
      const detail = (event as CustomEvent<MeetingGuidedSitzungsmodusEventDetail>).detail;
      const revealFocus = detail?.revealFocus !== false;

      window.dispatchEvent(
        new CustomEvent("meeting-workspace-navigate-tab", {
          detail: { tab: "traktanden" satisfies MeetingWorkspaceTabId },
        }),
      );

      if (!ctx.state.modeActive) {
        ctx.startMode();
      }

      if (revealFocus) {
        ctx.enterFocusPresentation();
      }
    }

    window.addEventListener(MEETING_GUIDED_SITZUNGSMODUS_EVENT, onEnter);
    return () => window.removeEventListener(MEETING_GUIDED_SITZUNGSMODUS_EVENT, onEnter);
  }, [timer]);

  return null;
}