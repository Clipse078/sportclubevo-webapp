"use client";

import type { ProjectionForecastDivergenceRow } from "@/lib/finance/projection/projection-workspace-dashboard";
import { formatBudgetPlanningSignedWholeMajorNumber } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_PROJECTION_CHART_SURFACE_CLASS,
  FinanceProjectionHorizontalBar,
} from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type FinanceProjectionDivergenceChartProps = {
  title: string;
  description: string;
  rows: readonly ProjectionForecastDivergenceRow[];
  formattingLocale: string;
};

export function FinanceProjectionDivergenceChart(props: FinanceProjectionDivergenceChartProps) {
  if (props.rows.length === 0) return null;
  const maxAbs = props.rows[0]?.absDeltaMinor ?? 1;

  return (
    <div className={FINANCE_PROJECTION_CHART_SURFACE_CLASS} data-finance-chart="projection-divergence">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)]">{props.description}</p>
      <div className="mt-3 space-y-3">
        {props.rows.map((row) => (
          <FinanceProjectionHorizontalBar
            key={row.accountId}
            label={row.accountName}
            valueLabel={formatBudgetPlanningSignedWholeMajorNumber(
              row.deltaMinor,
              props.formattingLocale,
            )}
            fraction={row.absDeltaMinor / maxAbs}
            barClassName="bg-[var(--foreground)]/55"
          />
        ))}
      </div>
    </div>
  );
}
