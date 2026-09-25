"use client";

/**
 * PLANNING-UX-07R4 — compact assignment row (subject + current resource + action).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PlanningResourceAssignmentProps = {
  subjectLeading?: ReactNode;
  subjectLabel: string;
  /** When false, the row shows only resource state + action (section title carries resource type). */
  showSubjectLabel?: boolean;
  subjectSecondary?: string | null;
  resourceLabel?: string | null;
  unassignedLabel: string;
  actionLabel: string;
  actionAriaLabel: string;
  onAction: () => void;
  disabled?: boolean;
  picker?: ReactNode;
  testId?: string;
  className?: string;
};

export function PlanningResourceAssignment({
  subjectLeading,
  subjectLabel,
  showSubjectLabel = true,
  subjectSecondary,
  resourceLabel,
  unassignedLabel,
  actionLabel,
  actionAriaLabel,
  onAction,
  disabled = false,
  picker,
  testId,
  className,
}: PlanningResourceAssignmentProps) {
  const assigned = Boolean(resourceLabel?.trim());

  return (
    <div
      className={cn("min-w-0", className)}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap">
        {showSubjectLabel ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {subjectLeading ? <span className="shrink-0">{subjectLeading}</span> : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{subjectLabel}</p>
              {subjectSecondary ? (
                <p className="truncate text-xs text-[var(--muted)]">{subjectSecondary}</p>
              ) : null}
            </div>
          </div>
        ) : subjectLeading ? (
          <span className="shrink-0">{subjectLeading}</span>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}

        <p
          className={cn(
            showSubjectLabel ? "shrink-0 text-sm tabular-nums" : "min-w-0 flex-1 text-sm",
            assigned ? "font-medium text-[var(--foreground)]" : "text-[var(--text-2)]",
          )}
          data-testid={testId ? `${testId}-resource` : undefined}
        >
          {assigned ? resourceLabel : unassignedLabel}
        </p>

        <button
          type="button"
          onClick={onAction}
          disabled={disabled}
          aria-label={actionAriaLabel}
          aria-expanded={Boolean(picker)}
          className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--sce-primary)] transition hover:bg-[var(--sce-primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid={testId ? `${testId}-action` : undefined}
        >
          {actionLabel}
        </button>
      </div>
      {picker}
    </div>
  );
}
