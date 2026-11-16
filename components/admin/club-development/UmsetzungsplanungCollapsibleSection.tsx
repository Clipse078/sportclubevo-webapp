"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  count: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  children: ReactNode;
  headerAside?: ReactNode;
};

export default function UmsetzungsplanungCollapsibleSection({
  title,
  count,
  open,
  onOpenChange,
  testId,
  children,
  headerAside,
}: Props) {
  const sectionId = `${testId}-body`;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]" data-testid={testId}>
      <div className="flex items-center gap-2 border-b border-[var(--border)]/70 bg-[var(--surface-2)]/60 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
          aria-expanded={open}
          aria-controls={sectionId}
          onClick={() => onOpenChange(!open)}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="min-w-0 truncate">{title}</span>
          <span className="text-xs font-normal text-[var(--muted)]" data-testid={`${testId}-count`}>
            ({count ?? "—"})
          </span>
        </button>
        {headerAside}
      </div>
      {open ? (
        <div id={sectionId} className="space-y-3 p-3 pt-2">
          {children}
        </div>
      ) : null}
    </section>
  );
}