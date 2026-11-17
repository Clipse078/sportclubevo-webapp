"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { measureMeetingWorkspaceScrollOffset } from "@/lib/meetings/meeting-workspace-scroll";

const STICKY_ELIGIBLE_LIFECYCLES = new Set(["running", "paused", "expired"]);

export function MeetingSitzungsmodusStickyTimer() {
  const timer = useMeetingAgendaTimer();
  const [topPx, setTopPx] = useState(144);

  useEffect(() => {
    const update = () => {
      const nav = document.querySelector<HTMLElement>("[data-meeting-workspace-section-nav]");
      setTopPx(measureMeetingWorkspaceScrollOffset(nav));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!timer?.state.modeActive) return null;
  if (!timer.activeItem) return null;
  if (!STICKY_ELIGIBLE_LIFECYCLES.has(timer.lifecycle)) return null;
  if (timer.focusCardInView) return null;

  const { presentation, state, activeItem, lifecycle } = timer;

  const countdownToneClass =
    presentation.kind === "warning"
      ? "text-amber-800"
      : presentation.kind === "final"
        ? "text-red-900"
      : presentation.kind === "expired" || presentation.kind === "overtime"
        ? "text-red-700"
        : "text-[var(--foreground)]";

  const toneClass =
    presentation.kind === "final"
      ? "border-red-200/90 bg-red-50/95"
      : presentation.kind === "warning"
        ? "border-amber-200/90 bg-white/95"
      : presentation.kind === "expired" || presentation.kind === "overtime"
        ? "border-red-200/90 bg-white/95"
        : "border-[var(--border)] bg-[var(--surface-1)]/95";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 px-4"
      style={{ top: topPx }}
      data-testid="meeting-sitzungsmodus-sticky-slot"
      aria-hidden={false}
    >
      <MotionSafe
        className={`pointer-events-auto mx-auto w-full max-w-5xl rounded-b-lg border-b border-x shadow-sm backdrop-blur-sm ${toneClass}`}
        data-testid="meeting-sitzungsmodus-sticky"
        role="status"
      >
        <MotionSafe className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
            {activeItem.title}
            {state.phase === "paused" ? " · pausiert" : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`font-mono text-base font-semibold tabular-nums ${countdownToneClass}`}>
              {presentation.display}
            </span>
            {state.phase === "running" ? (
              <button
                type="button"
                className="fca-button-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
                onClick={timer.pauseTimer}
              >
                <Pause className="h-3.5 w-3.5" aria-hidden />
                Pause
              </button>
            ) : state.phase === "paused" ? (
              <button
                type="button"
                className="fca-button-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
                onClick={timer.resumeTimer}
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
                Fortsetzen
              </button>
            ) : null}
            <button
              type="button"
              className="fca-button-ghost px-2 py-1 text-xs"
              onClick={timer.scrollToFocusCard}
            >
              Zum Timer
            </button>
          </div>
        </MotionSafe>
        <span className="sr-only" data-testid="meeting-sitzungsmodus-sticky-lifecycle">
          {lifecycle}
        </span>
      </MotionSafe>
    </div>
  );
}

function MotionSafe({
  children,
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) {
  return (
    <div className={className} style={style} data-reduced-motion-safe="true" {...rest}>
      {children}
    </div>
  );
}