"use client";

import { cn } from "@/lib/cn";
import { FINANCE_SUMMARY_STRIP_SURFACE_CLASS } from "@/lib/finance/finance-workspace-surfaces";
import {
  FINANCE_MONEY_COMPARATIVE_HERO_CLASS,
  FINANCE_MONEY_SECONDARY_AMOUNT_CLASS,
  FINANCE_MONEY_SUPPORTING_NUMERIC_CLASS,
  FINANCE_MONEY_VARIANCE_AMOUNT_CLASS,
} from "@/lib/finance/presentation/finance-money-typography";
import { financeVarianceComparisonSemanticTextClass } from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";

export type FinanceComparativeSummarySectionProps = {
  title: string;
  titleId: string;
  budgetedResultLabel: string;
  budgetedResultValue: string;
  expectedResultLabel: string;
  expectedResultValue: string;
  varianceLabel: string;
  varianceValue: string;
  varianceFavorability: VarianceFavorability | null;
  hasVarianceComparison: boolean;
  favorabilityText: string | null;
  actualEvidenceLabel: string;
  actualEvidenceValue: string;
  grainExplanationText?: string | null;
  partialSourcesHint?: string | null;
  className?: string;
};

/**
 * Decision-first comparative summary — expected outcome and variance lead;
 * budget and actual read as supporting context (not four equal KPI tiles).
 */
export function FinanceComparativeSummarySection({
  title,
  titleId,
  budgetedResultLabel,
  budgetedResultValue,
  expectedResultLabel,
  expectedResultValue,
  varianceLabel,
  varianceValue,
  varianceFavorability,
  hasVarianceComparison,
  favorabilityText,
  actualEvidenceLabel,
  actualEvidenceValue,
  grainExplanationText,
  partialSourcesHint,
  className,
}: FinanceComparativeSummarySectionProps) {
  return (
    <section
      className={cn(FINANCE_SUMMARY_STRIP_SURFACE_CLASS, "space-y-3", className)}
      aria-labelledby={titleId}
      data-finance-comparative-summary
      data-finance-pnl-interpretation
    >
      <h2 id={titleId} className="text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h2>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-6">
        <div className="min-w-0 space-y-3" data-finance-comparative-summary-primary>
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">{expectedResultLabel}</p>
            <p className={cn(FINANCE_MONEY_COMPARATIVE_HERO_CLASS, "mt-0.5")}>
              {expectedResultValue}
            </p>
          </div>
          <div data-finance-comparative-primary-variance>
            <p className="text-xs font-medium text-[var(--muted)]">{varianceLabel}</p>
            <p
              className={cn(
                FINANCE_MONEY_VARIANCE_AMOUNT_CLASS,
                "mt-0.5",
                financeVarianceComparisonSemanticTextClass({
                  favorability: varianceFavorability,
                  hasComparison: hasVarianceComparison,
                }),
              )}
            >
              <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {varianceValue}
                {hasVarianceComparison && favorabilityText ? (
                  <span className={FINANCE_MONEY_SUPPORTING_NUMERIC_CLASS}>{favorabilityText}</span>
                ) : null}
              </span>
            </p>
          </div>
        </div>

        <dl
          className="grid min-w-0 gap-3 border-[var(--sce-surface-border-subtle)] sm:grid-cols-2 sm:gap-x-4 lg:border-s lg:pl-6"
          data-finance-comparative-summary-context
        >
          <div>
            <dt className="text-xs font-medium text-[var(--muted)]">{budgetedResultLabel}</dt>
            <dd className={cn(FINANCE_MONEY_SECONDARY_AMOUNT_CLASS, "mt-0.5")}>
              {budgetedResultValue}
            </dd>
          </div>
          <div data-finance-comparative-actual-evidence>
            <dt className="text-xs font-medium text-[var(--muted)]">{actualEvidenceLabel}</dt>
            <dd className={cn(FINANCE_MONEY_SECONDARY_AMOUNT_CLASS, "mt-0.5")}>
              {actualEvidenceValue}
            </dd>
          </div>
        </dl>
      </div>

      {grainExplanationText ? (
        <p
          className="text-xs leading-relaxed text-[var(--muted)]"
          data-finance-comparative-grain-explanation
        >
          {grainExplanationText}
        </p>
      ) : null}
      {partialSourcesHint ? (
        <p className="text-xs text-[var(--muted)]">{partialSourcesHint}</p>
      ) : null}
    </section>
  );
}
