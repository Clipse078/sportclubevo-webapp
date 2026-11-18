"use client";

import { useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { useMeetingAgendaTimer } from "@/components/admin/meetings/workspace/MeetingAgendaTimerProvider";
import { MeetingSitzungsmodusSessionEndSummary } from "@/components/admin/meetings/workspace/MeetingSitzungsmodusSessionEndSummary";
import { buildGuidedSitzungsmodusSessionSummary } from "@/lib/meetings/sitzungsmodus/meeting-guided-session-summary";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import { buildCanonicalAgendaDisplayOrderMap } from "@/lib/meetings/agenda-display-order";

type AgendaItem = MeetingSubEntities["agendaItems"][number];
type MeetingAction = MeetingSubEntities["actions"][number];

type MeetingSitzungsmodusCompactResumeProps = {
  agendaItems: AgendaItem[];
  actions: MeetingAction[];
};

/** Shown in Traktanden when Sitzungsmodus runs but the page-wide focus surface is closed. */
export function MeetingSitzungsmodusCompactResume({
  agendaItems,
  actions,
}: MeetingSitzungsmodusCompactResumeProps) {
  const timer = useMeetingAgendaTimer();
  const [sessionEndSummary, setSessionEndSummary] = useState<ReturnType<
    typeof buildGuidedSitzungsmodusSessionSummary
  > | null>(null);

  const displayOrder = useMemo(() => buildCanonicalAgendaDisplayOrderMap(agendaItems), [agendaItems]);

  if (!timer?.state.modeActive || timer.focusPresentationActive) return null;

  const active = timer.activeItem;
  const position = active
    ? (timer.orderedItems.find((i) => i.id === active.id)?.position ?? null)
    : null;

  function requestEndSession() {
    const summary = buildGuidedSitzungsmodusSessionSummary({
      agendaItems: agendaItems.map((item, idx) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        position: displayOrder.get(item.id) ?? idx + 1,
      })),
      actions: actions.map((action) => ({
        id: action.id,
        title: action.title,
        status: action.status,
      })),
    });
    if (summary.hasGaps) {
      setSessionEndSummary(summary);
      return;
    }
    timer?.endMode();
  }

  return (
    <MotionSafe className="mb-3 w-full min-w-0 space-y-2" data-testid="meeting-sitzungsmodus-compact-resume-wrap">
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[#f4f7fb] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-[var(--foreground)]">Sitzungsmodus aktiv</p>
          <p className="text-[var(--text-2)]">
            {active ? `Traktandum ${position ?? "—"}: ${active.title}` : "Kein Traktandum ausgewählt"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="fca-button-primary inline-flex shrink-0 items-center gap-2 text-sm"
            onClick={timer.enterFocusPresentation}
            data-testid="meeting-sitzungsmodus-resume-focus"
          >
            <Clock3 className="h-4 w-4" aria-hidden />
            Sitzungsmodus fortsetzen
          </button>
          <button
            type="button"
            className="fca-button-secondary text-sm"
            onClick={requestEndSession}
            data-testid="meeting-sitzungsmodus-end"
          >
            Sitzungsmodus beenden
          </button>
        </div>
      </div>
      {sessionEndSummary ? (
        <MeetingSitzungsmodusSessionEndSummary
          summary={sessionEndSummary}
          onConfirmEnd={() => {
            setSessionEndSummary(null);
            timer.endMode();
          }}
          onDismiss={() => setSessionEndSummary(null)}
        />
      ) : null}
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