"use client";

import type { ProjectionOutlookComparisonRow } from "@/lib/finance/projection/projection-workspace-dashboard";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import {
  FINANCE_PROJECTION_CHART_SURFACE_CLASS,
  FinanceProjectionChartLegend,
} from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type FinanceProjectionOutlookChartProps = {
  rows: readonly ProjectionOutlookComparisonRow[];
  metricLabels: Record<ProjectionOutlookComparisonRow["metric"], string>;
  seriesLabels: {
    actual: string;
    forecast: string;
    projection: string;
    budget?: string;
  };
  currency: string | null;
  formattingLocale: string;
  title: string;
};

const SERIES_FILL = {
  actual: "bg-[var(--foreground)]/80",
  forecast: "bg-[var(--muted)]/70",
  projection: "bg-[var(--primary)]/85",
  budget: "bg-[var(--sce-surface-border)]",
} as const;

function maxAbsMinor(rows: readonly ProjectionOutlookComparisonRow[]): number {
  let max = 1;
  for (const row of rows) {
    for (const v of [row.actualMinor, row.forecastMinor, row.projectionMinor, row.budgetMinor]) {
      if (v !== null) max = Math.max(max, Math.abs(v));
    }
  }
  return max;
}

export function FinanceProjectionOutlookChart(props: FinanceProjectionOutlookChartProps) {
  const scaleMax = maxAbsMinor(props.rows);
  const showBudget = props.rows.some((r) => r.budgetMinor !== null);

  return (
    <div className={FINANCE_PROJECTION_CHART_SURFACE_CLASS} data-finance-chart="projection-outlook">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <div className="mt-3 space-y-4">
        {props.rows.map((row) => {
          const series: Array<{
            key: string;
            label: string;
            minor: number | null;
            fill: string;
          }> = [
            { key: "actual", label: props.seriesLabels.actual, minor: row.actualMinor, fill: SERIES_FILL.actual },
            {
              key: "forecast",
              label: props.seriesLabels.forecast,
              minor: row.forecastMinor,
              fill: SERIES_FILL.forecast,
            },
            {
              key: "projection",
              label: props.seriesLabels.projection,
              minor: row.projectionMinor,
              fill: SERIES_FILL.projection,
            },
          ];
          if (showBudget && row.budgetMinor !== null) {
            series.push({
              key: "budget",
              label: props.seriesLabels.budget ?? "Budget",
              minor: row.budgetMinor,
              fill: SERIES_FILL.budget,
            });
          }

          return (
            <div key={row.metric} className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {props.metricLabels[row.metric]}
              </p>
              <div className="space-y-1.5">
                {series.map((s) => {
                  const width =
                    s.minor === null ? 0 : (Math.abs(s.minor) / scaleMax) * 100;
                  return (
                    <div key={s.key} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                      <span className="text-[var(--muted)]">{s.label}</span>
                      <div className="h-2 overflow-hidden rounded-sm bg-[var(--surface-2)]">
                        <div className={`h-full rounded-sm ${s.fill}`} style={{ width: `${width}%` }} />
                      </div>
                      <span className="tabular-nums text-[var(--foreground)]">
                        {s.minor === null
                          ? "—"
                          : formatFinanceManagementPlanningMinor(
                              s.minor,
                              props.currency,
                              props.formattingLocale,
                            )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <FinanceProjectionChartLegend
          items={[
            { key: "actual", label: props.seriesLabels.actual, className: SERIES_FILL.actual },
            { key: "forecast", label: props.seriesLabels.forecast, className: SERIES_FILL.forecast },
            {
              key: "projection",
              label: props.seriesLabels.projection,
              className: SERIES_FILL.projection,
            },
            ...(showBudget && props.seriesLabels.budget
              ? [{ key: "budget", label: props.seriesLabels.budget, className: SERIES_FILL.budget }]
              : []),
          ]}
        />
      </div>
    </div>
  );
}
