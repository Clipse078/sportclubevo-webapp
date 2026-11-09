"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSceMatchCardCollapsibleDetails } from "@/lib/sporting-activity-presentation/canonical/match-card-collapsible-details";

export type SceMatchCardCollapsibleSummaryControls = {
  expanded: boolean;
  toggle: () => void;
  panelId: string;
};

type Props = {
  matchId: string;
  panelId: string;
  summary: ReactNode;
  /** Compact readiness control beside the chevron — receives live expansion state. */
  summaryControl?: (controls: SceMatchCardCollapsibleSummaryControls) => ReactNode;
  details: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  testId?: string;
};

function stopPointerActivation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function SceMatchCardCollapsibleOperationalDetails({
  matchId,
  panelId,
  summary,
  summaryControl,
  details,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  className,
  testId = "sce-match-collapsible-operational-details",
}: Props) {
  const { expanded, toggle } = useSceMatchCardCollapsibleDetails({
    defaultExpanded,
    expanded: expandedProp,
    onExpandedChange,
  });

  const toggleLabel = expanded
    ? "Spielvorbereitung einklappen"
    : "Spielvorbereitung ausklappen";

  return (
    <div
      className={cn("min-w-0 flex flex-col gap-2.5", className)}
      data-testid={testId}
      data-sce-match-id={matchId}
      data-sce-match-collapsible-details
      data-sce-match-collapsible-expanded={expanded ? "true" : "false"}
    >
      <div className="min-w-0 w-full max-md:pr-8">{summary}</div>

      <div
        className="flex min-w-0 items-center gap-2"
        data-testid={`${testId}-summary-controls`}
      >
        {summaryControl ? (
          <div
            className="min-w-0 flex-1"
            onPointerDown={stopPointerActivation}
            onClick={stopPointerActivation}
          >
            {summaryControl({ expanded, toggle, panelId })}
          </div>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        <button
          type="button"
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            "text-[var(--muted)] transition-colors",
            "hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
            "motion-safe:transition-transform",
          )}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={toggleLabel}
          data-testid={`${testId}-toggle`}
          onClick={(event) => {
            stopPointerActivation(event);
            toggle();
          }}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0",
              expanded && "rotate-180",
              "motion-reduce:transition-none",
              "motion-safe:transition-transform motion-safe:duration-200",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id={panelId}
        role="region"
        aria-label="Spielvorbereitung"
        hidden={!expanded}
        className={cn(
          !expanded && "hidden",
          expanded && "border-t border-[var(--border)]/45 pt-2.5",
        )}
        data-testid={`${testId}-panel`}
      >
        {expanded ? details : null}
      </div>
    </div>
  );
}

export type SceMatchCardReadinessToggleProps = {
  panelId: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/** Wraps compact readiness UI so it can expand the shared operational panel. */
export function SceMatchCardReadinessToggle({
  panelId,
  expanded,
  onToggle,
  children,
  className,
  testId = "sce-match-readiness-toggle",
}: SceMatchCardReadinessToggleProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex max-w-full items-center text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0 rounded-full",
        className,
      )}
      aria-expanded={expanded}
      aria-controls={panelId}
      data-testid={testId}
      onClick={(event) => {
        stopPointerActivation(event);
        onToggle();
      }}
    >
      {children}
    </button>
  );
}

export { useSceMatchCardCollapsibleDetails };
