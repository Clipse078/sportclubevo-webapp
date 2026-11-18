"use client";

import { Clock3 } from "lucide-react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";

/** Shown in Traktanden when Sitzungsmodus runs but the page-wide focus surface is closed. */
export function MeetingSitzungsmodusCompactResume() {
  const timer = useMeetingAgendaTimer();
  if (!timer?.state.modeActive || timer.focusPresentationActive) return null;

  const active = timer.activeItem;
  const position = active
    ? (timer.orderedItems.find((i) => i.id === active.id)?.position ?? null)
    : null;

  return (
    <MotionSafe
      className="mb-3 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[#f4f7fb] p-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid="meeting-sitzungsmodus-compact-resume"
    >
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-[var(--foreground)]">Sitzungsmodus aktiv</p>
        <p className="text-[var(--text-2)]">
          {active
            ? `Traktandum ${position ?? "—"}: ${active.title}`
            : "Kein Traktandum ausgewählt"}
        </p>
      </div>
      <button
        type="button"
        className="fca-button-primary inline-flex shrink-0 items-center gap-2 text-sm"
        onClick={timer.enterFocusPresentation}
        data-testid="meeting-sitzungsmodus-resume-focus"
      >
        <Clock3 className="h-4 w-4" aria-hidden />
        Sitzungsmodus fortsetzen
      </button>
    </MotionSafe>
  );
}

function MotionSafe({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} data-reduced-motion-safe="true" {...rest}>
      {children}
    </div>
  );
}