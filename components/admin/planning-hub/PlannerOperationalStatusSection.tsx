"use client";

import {
  derivePlannerOperationalStatus,
  plannerOperationalConflictDetailMessages,
  plannerOperationalIncompleteDetailMessages,
} from "@/lib/planning-hub/planner-operational-status";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  locale: string;
  timezone: string;
  variant?: "detail-popover" | "editor-sheet";
  testId?: string;
};

/**
 * Shared Planungsstatus block for hover/focus detail and opened planning workspace.
 */
export default function PlannerOperationalStatusSection({
  item,
  locale,
  timezone,
  variant = "detail-popover",
  testId = "planner-operational-status-section",
}: Props) {
  const status = derivePlannerOperationalStatus(item);
  if (!status.hasIssues) return null;

  const conflictLines = plannerOperationalConflictDetailMessages(item, locale, timezone);
  const incompleteLines = plannerOperationalIncompleteDetailMessages(item);
  const openLines = [...status.openActionLabels];

  const sectionClass =
    variant === "editor-sheet"
      ? "space-y-3 rounded-xl border border-amber-300/40 bg-amber-500/5 px-4 py-3"
      : "mt-2 space-y-2 border-t border-[var(--border)]/80 pt-2";

  return (
    <section className={sectionClass} data-testid={testId} aria-label="Planungsstatus">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Planungsstatus</p>

      {status.conflictCount > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {status.conflictCount === 1 ? "1 Konflikt" : `${status.conflictCount} Konflikte`}
          </p>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-snug text-[var(--foreground)]">
            {conflictLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {status.incompleteCount > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">Unvollständig</p>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-snug text-[var(--foreground)]">
            {incompleteLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {openLines.length > 0 && status.conflictCount === 0 && status.incompleteCount === 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">Offen</p>
          <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-snug text-[var(--foreground)]">
            {openLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
