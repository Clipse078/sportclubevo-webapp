"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import {
  SCE_CD_SECTION_BODY_CLASS,
  SCE_CD_SECTION_HEADER_CLASS,
  SCE_CD_SECTION_SHELL_CLASS,
} from "./sce-club-development-surface-styles";

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
    <section className={SCE_CD_SECTION_SHELL_CLASS} data-testid="strategy-supporting-section">
      <div className={SCE_CD_SECTION_HEADER_CLASS}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
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
      </div>
      <div id={panelId} hidden={!expanded} className={`${SCE_CD_SECTION_BODY_CLASS} grid gap-4 lg:grid-cols-2`}>
        {children}
      </div>
    </section>
  );
}