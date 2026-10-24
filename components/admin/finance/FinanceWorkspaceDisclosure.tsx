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
  /** `stacked` — title block + text trigger (default). `row` — single clickable summary row with chevron. */
  variant?: "stacked" | "row";
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
  variant = "stacked",
  className,
  "data-finance-disclosure": dataAttr,
}: FinanceWorkspaceDisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  const triggerLabel = expanded ? collapseLabel : expandLabel;

  if (variant === "row") {
    return (
      <div className={cn("min-w-0", className)} data-finance-disclosure={dataAttr}>
        <button
          type="button"
          className="flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={triggerLabel}
          onClick={() => setExpanded((open) => !open)}
          data-finance-disclosure-trigger
          data-finance-disclosure-variant="row"
        >
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="block text-sm font-semibold text-[var(--foreground)]">{title}</span>
            {summary ? (
              <span className="block text-xs text-[var(--muted)]">{summary}</span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--muted)] transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {expanded ? (
          <div
            id={panelId}
            className="border-t border-[var(--sce-surface-border-subtle)] px-4 pb-4 pt-3"
            data-finance-disclosure-panel
          >
            {children}
          </div>
        ) : null}
      </div>
    );
  }

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
