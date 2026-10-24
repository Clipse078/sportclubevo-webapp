"use client";

import type { ProjectionCompositionSegment } from "@/lib/finance/projection/projection-workspace-dashboard";
import { formatBudgetPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_PROJECTION_CHART_SURFACE_CLASS,
  FinanceProjectionHorizontalBar,
} from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type FinanceProjectionCompositionChartProps = {
  title: string;
  segments: readonly ProjectionCompositionSegment[];
  currency: string | null;
  formattingLocale: string;
  emptyHint?: string;
};

export function FinanceProjectionCompositionChart(props: FinanceProjectionCompositionChartProps) {
  if (props.segments.length === 0) {
    return null;
  }

  const topShare = props.segments[0]?.shareOfSideTotal ?? 1;

  return (
    <div
      className={FINANCE_PROJECTION_CHART_SURFACE_CLASS}
      data-finance-chart="projection-composition"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <div className="mt-3 space-y-3">
        {props.segments.map((segment) => (
          <FinanceProjectionHorizontalBar
            key={segment.accountId}
            label={segment.accountName}
            valueLabel={formatBudgetPlanningMinor(
              segment.projectedAmountMinor,
              props.currency,
              props.formattingLocale,
            )}
            fraction={segment.shareOfSideTotal / topShare}
            barClassName="bg-[var(--primary)]/75"
          />
        ))}
      </div>
    </div>
  );
}
