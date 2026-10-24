"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type FinanceWorkspaceDisclosureProps = {
  title: ReactNode;
  summary?: ReactNode;
  expandLabel: string;
  collapseLabel: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  "data-finance-disclosure"?: string;
};

/**
 * Canonical accessible disclosure for Finance workspaces (button + aria-expanded).
 */
export function FinanceWorkspaceDisclosure({
  title,
  summary,
  expandLabel,
  collapseLabel,
  children,
  defaultExpanded = false,
  className,
  "data-finance-disclosure": dataAttr,
}: FinanceWorkspaceDisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const triggerLabel = expanded ? collapseLabel : expandLabel;

  return (
    <div className={cn("space-y-2", className)} data-finance-disclosure={dataAttr}>
      <div className="space-y-0.5">
        <div className="text-sm font-semibold text-[var(--foreground)]">{title}</div>
        {summary ? <p className="text-xs text-[var(--muted)]">{summary}</p> : null}
      </div>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        data-finance-disclosure-trigger
      >
        {triggerLabel}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div id={panelId} data-finance-disclosure-panel>
          {children}
        </div>
      ) : null}
    </div>
  );
}
