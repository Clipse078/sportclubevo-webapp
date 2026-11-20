"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type SceClubDevelopmentContextualCreateCollapsibleShellProps = {
  actionLabel: string;
  contextLabel?: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  panelDomId: string;
  cardTestId: string;
  collapseToggleTestId: string;
  children: ReactNode;
  discardPrompt?: ReactNode;
  /** When set, skip the built-in collapsible header (toolbar owns the trigger). */
  hideToggle?: boolean;
};

/**
 * Inline page-flow collapsible card for contextual Club Development create/link flows.
 * No modal overlay, portal, or internal scroll region — content follows document flow.
 */
export default function SceClubDevelopmentContextualCreateCollapsibleShell({
  actionLabel,
  contextLabel,
  expanded,
  onExpandedChange,
  panelDomId,
  cardTestId,
  collapseToggleTestId,
  children,
  discardPrompt,
  hideToggle = false,
}: SceClubDevelopmentContextualCreateCollapsibleShellProps) {
  if (hideToggle && !expanded) return null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid={cardTestId}
      data-expanded={expanded ? "true" : "false"}
      data-sce-contextual-create-flow="inline-collapsible"
    >
      {hideToggle ? null : (
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            aria-expanded={expanded}
            aria-controls={panelDomId}
            onClick={() => onExpandedChange(!expanded)}
            data-testid={collapseToggleTestId}
          >
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {actionLabel}
            </span>
          </button>
          {contextLabel ? (
            <span className="text-[11px] text-[var(--muted)]" data-testid={`${cardTestId}-context`}>
              {contextLabel}
            </span>
          ) : null}
        </div>
      )}

      <div id={panelDomId} hidden={!expanded} className="p-4">
        {discardPrompt}
        {children}
      </div>
    </div>
  );
}