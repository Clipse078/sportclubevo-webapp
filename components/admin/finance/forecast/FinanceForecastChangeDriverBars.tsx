"use client";

import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningSignedMinor } from "@/lib/finance/budget/budget-amount-presentation";
import { FINANCE_PROJECTION_CHART_SURFACE_CLASS } from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type ChangeDriverRow = {
  key: string;
  accountName: string;
  deltaMinor: number;
};

type FinanceForecastChangeDriverBarsProps = {
  title?: string;
  description?: string;
  rows: readonly ChangeDriverRow[];
  currency: string | null;
  formattingLocale: string;
  "data-finance-surface"?: string;
  barClassName?: string;
};

export function FinanceForecastChangeDriverBars(props: FinanceForecastChangeDriverBarsProps) {
  if (props.rows.length === 0) return null;

  const maxAbs = Math.max(...props.rows.map((r) => Math.abs(r.deltaMinor)), 1);

  return (
    <div
      className={cn(FINANCE_PROJECTION_CHART_SURFACE_CLASS, "py-3")}
      data-finance-surface={props["data-finance-surface"]}
      data-finance-chart="forecast-change-drivers"
    >
      {props.title ? (
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {props.title}
        </h4>
      ) : null}
      {props.description ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{props.description}</p>
      ) : null}
      <ul className="mt-3 space-y-2.5" role="list">
        {props.rows.map((row) => {
          const fraction = Math.abs(row.deltaMinor) / maxAbs;
          const isPositive = row.deltaMinor >= 0;
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate text-[var(--foreground)]">{row.accountName}</p>
                <div
                  className="relative mt-1 flex h-2 w-full items-stretch overflow-hidden rounded-sm bg-[var(--surface-2)]"
                  role="img"
                  aria-label={
                    isPositive
                      ? `Mathematische Zunahme ${Math.round(fraction * 100)} Prozent der Skala`
                      : `Mathematische Abnahme ${Math.round(fraction * 100)} Prozent der Skala`
                  }
                >
                  <div className="flex w-1/2 justify-end">
                    {!isPositive ? (
                      <div
                        className={cn(
                          "h-full rounded-s-sm",
                          props.barClassName ?? "bg-[var(--foreground)]/50",
                        )}
                        style={{ width: `${fraction * 100}%` }}
                        data-finance-driver-direction="negative"
                      />
                    ) : null}
                  </div>
                  <div
                    className="absolute start-1/2 top-0 z-[1] h-full w-px -translate-x-1/2 bg-[var(--foreground)]/30"
                    aria-hidden
                    data-finance-driver-zero-axis
                  />
                  <div className="flex w-1/2 justify-start">
                    {isPositive ? (
                      <div
                        className={cn(
                          "h-full rounded-e-sm",
                          props.barClassName ?? "bg-[var(--foreground)]/50",
                        )}
                        style={{ width: `${fraction * 100}%` }}
                        data-finance-driver-direction="positive"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
              <span className="tabular-nums text-[var(--foreground)]">
                {formatFinanceManagementPlanningSignedMinor(
                  row.deltaMinor,
                  props.currency,
                  props.formattingLocale,
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
