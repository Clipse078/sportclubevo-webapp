"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceExpandablePanelProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  testId?: string;
};

/** Accordion-style optional detail surface — finance-aligned white panel. */
export function SceExpandablePanel({
  summary,
  children,
  defaultOpen = false,
  className,
  testId = "sce-expandable-panel",
}: SceExpandablePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    <div className={cn("min-w-0", className)} data-sce-expandable-panel data-testid={testId}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[var(--sce-radius-control)]",
          "border border-[var(--sce-color-border-standard)] bg-[var(--sce-color-surface-standard)]",
          "px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]",
          "transition hover:bg-[var(--card-hover)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="min-w-0 flex-1">{summary}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--text-2)] transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          id={regionId}
          className="mt-2 rounded-[var(--sce-radius-control)] border border-[var(--sce-color-border-standard)] bg-[var(--sce-color-surface-standard)] p-4"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
