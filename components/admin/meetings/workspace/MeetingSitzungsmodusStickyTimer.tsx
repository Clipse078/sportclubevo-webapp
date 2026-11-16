"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { measureMeetingWorkspaceScrollOffset } from "@/lib/meetings/meeting-workspace-scroll";

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

  const { presentation, state, activeItem } = timer;
  const toneClass =
    presentation.kind === "warning"
      ? "border-amber-300/80 bg-amber-50/95 text-amber-950"
      : presentation.kind === "expired" || presentation.kind === "overtime"
        ? "border-red-300/80 bg-red-50/95 text-red-950"
        : "border-[var(--border)] bg-[var(--surface-1)]/95 text-[var(--foreground)]";

  return (
    <MotionSafe
      className={`fixed left-0 right-0 z-30 border-b px-4 py-2 shadow-sm backdrop-blur-sm ${toneClass}`}
      style={{ top: topPx }}
      data-testid="meeting-sitzungsmodus-sticky"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-medium">
          {activeItem ? activeItem.title : "Sitzungsmodus"}
          {state.phase === "paused" ? " · pausiert" : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {presentation.kind === "warning" ? <AlertTriangle className="h-4 w-4" aria-hidden /> : null}
          <span className="text-xs font-medium">{presentation.label}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">{presentation.display}</span>
        </div>
      </div>
    </MotionSafe>
  );
}

function MotionSafe({
  children,
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) {
  return (
    <div className={className} style={style} {...rest}>
      {children}
    </div>
  );
}