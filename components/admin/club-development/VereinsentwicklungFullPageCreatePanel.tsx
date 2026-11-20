"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  panelTitle: string;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
  originContext?: ReactNode;
  panelDomId: string;
  cardTestId: string;
  formTestId?: string;
};

/**
 * Matches Aufgaben full-create panel chrome (always expanded on dedicated create routes).
 */
export default function VereinsentwicklungFullPageCreatePanel({
  panelTitle,
  children,
  footer,
  error,
  originContext,
  panelDomId,
  cardTestId,
  formTestId,
}: Props) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid={cardTestId}
      data-expanded="true"
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className="h-4 w-4 shrink-0 rotate-180 text-[var(--muted)]" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {panelTitle}
          </span>
        </div>
      </div>

      <div id={panelDomId} className="p-4">
        {error ? (
          <p
            className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200"
            role="alert"
            data-testid="vereinsentwicklung-create-error"
          >
            {error}
          </p>
        ) : null}

        {originContext ? <div className="mb-4">{originContext}</div> : null}

        <div data-testid={formTestId}>{children}</div>

        {footer ? <div className="mt-4 flex flex-wrap gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}