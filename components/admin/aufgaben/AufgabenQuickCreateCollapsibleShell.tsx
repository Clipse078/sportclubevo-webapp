"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  panelDomId: string;
  cardTestId: string;
  collapseToggleTestId: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Collapsible inline card shell for Aufgaben quick-create (no modal overlay). */
export default function AufgabenQuickCreateCollapsibleShell({
  title,
  expanded,
  onExpandedChange,
  panelDomId,
  cardTestId,
  collapseToggleTestId,
  children,
  footer,
}: Props) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid={cardTestId}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
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
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</span>
        </button>
      </div>

      <div id={panelDomId} hidden={!expanded} className="p-4">
        {children}
        {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
