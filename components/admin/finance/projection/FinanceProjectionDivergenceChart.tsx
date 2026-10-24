"use client";

import type { ProjectionForecastDivergenceRow } from "@/lib/finance/projection/projection-workspace-dashboard";
import { formatFinanceAutomaticForecastSignedMinor } from "@/lib/finance/projection/projection-amount-presentation";
import {
  FINANCE_PROJECTION_CHART_SURFACE_CLASS,
  FinanceProjectionHorizontalBar,
} from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type FinanceProjectionDivergenceChartProps = {
  title: string;
  description: string;
  alignedMessage: string;
  rows: readonly ProjectionForecastDivergenceRow[] | null;
  currency: string | null;
  formattingLocale: string;
};

export function FinanceProjectionDivergenceChart(props: FinanceProjectionDivergenceChartProps) {
  if (props.rows === null) return null;
  if (props.rows.length === 0) {
    return (
      <div
        className={FINANCE_PROJECTION_CHART_SURFACE_CLASS}
        data-finance-chart="projection-divergence"
        data-finance-projection-divergence="aligned"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {props.title}
        </h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{props.alignedMessage}</p>
      </div>
    );
  }
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
            valueLabel={formatFinanceAutomaticForecastSignedMinor(
              row.deltaMinor,
              props.currency,
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
