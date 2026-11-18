"use client";

import type { ReactNode } from "react";
import type { GuidedSitzungsmodusSessionSummary } from "@/lib/meetings/sitzungsmodus/meeting-guided-session-summary";

type Props = {
  summary: GuidedSitzungsmodusSessionSummary;
  onConfirmEnd: () => void;
  onDismiss: () => void;
};

/** Inline confirmation when ending Sitzungsmodus with open topics or Pendenzen (not a modal overlay). */
export function MeetingSitzungsmodusSessionEndSummary({
  summary,
  onConfirmEnd,
  onDismiss,
}: Props) {
  return (
    <MotionSafe
      as="section"
      className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm"
      aria-labelledby="meeting-guided-session-summary-title"
      aria-live="polite"
      data-testid="meeting-sitzungsmodus-session-summary"
    >
      <h2 id="meeting-guided-session-summary-title" className="text-sm font-semibold text-[var(--foreground)]">
        Sitzungsmodus — Kurzüberblick
      </h2>
      {summary.openTopics.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-semibold text-[var(--muted)]">Offene Traktanden</p>
          <ul className="list-inside list-disc text-[var(--text-2)]">
            {summary.openTopics.map((topic) => (
              <li key={topic.id}>
                Traktandum {topic.position}: {topic.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {summary.incompleteActions.length > 0 ? (
        <div className="mt-2 space-y-1">
          <p className="text-xs font-semibold text-[var(--muted)]">Offene Pendenzen</p>
          <ul className="list-inside list-disc text-[var(--text-2)]">
            {summary.incompleteActions.map((action) => (
              <li key={action.id}>{action.title}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <MotionSafe className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="fca-button-primary text-sm" onClick={onConfirmEnd}>
          Sitzungsmodus beenden
        </button>
        <button type="button" className="fca-button-secondary text-sm" onClick={onDismiss}>
          Weiter im Modus
        </button>
      </MotionSafe>
    </MotionSafe>
  );
}

function MotionSafe({
  children,
  className,
  as: Component = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Component className={className} data-reduced-motion-safe="true" {...rest}>
      {children}
    </Component>
  );
}