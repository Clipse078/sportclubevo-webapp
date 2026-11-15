"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";

type Props = {
  meetingCount: number;
  decisionCount: number;
  documentCount: number;
  children: ReactNode;
};

export default function StrategySupportingMaterialsCard({
  meetingCount,
  decisionCount,
  documentCount,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const panelId = "strategy-supporting-materials-panel";
  const summary = CD_STRATEGY_AUTHORING_COPY.supportingCollapsedSummary(
    meetingCount,
    decisionCount,
    documentCount,
  );

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
      data-testid="strategy-supporting-section"
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        data-testid="strategy-supporting-toggle"
      >
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.supportingHeading}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]" data-testid="strategy-supporting-summary">
            {summary}
          </p>
        </div>
      </button>
      <div id={panelId} hidden={!expanded} className="border-t border-[var(--border)] p-4">
        <div className="grid gap-4 lg:grid-cols-2">{children}</div>
      </div>
    </section>
  );
}