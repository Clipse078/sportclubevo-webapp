"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import type { ForecastEvolutionChartPoint } from "@/lib/finance/forecast/forecast-evolution-presentation";
import {
  formatForecastEvolutionPointSecondaryMeta,
  resolveForecastEvolutionPointHeadline,
} from "@/lib/finance/forecast/forecast-evolution-presentation";

type FinanceForecastEvolutionChartProps = {
  title: string;
  seriesLabel: string;
  points: readonly ForecastEvolutionChartPoint[];
  currency: string | null;
  formattingLocale: string;
  currentBadgeLabel: string;
  tooltipLabels: {
    income: string;
    expense: string;
    result: string;
  };
  formatPointAsOf: (point: ForecastEvolutionChartPoint) => string | null;
  formatVersionMeta: (versionNumber: number) => string;
  embedded?: boolean;
};

export function FinanceForecastEvolutionChart(props: FinanceForecastEvolutionChartProps) {
  const baseId = useId();

  if (props.points.length === 0) {
    return null;
  }

  const showConnector = props.points.length >= 2;

  return (
    <div
      className={cn(
        !props.embedded &&
          "rounded-lg border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-1)] p-4",
      )}
      data-finance-chart="forecast-evolution"
      data-finance-surface="prognoseentwicklung"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{props.seriesLabel}</p>

      <div
        className={cn(
          "relative mt-3 min-w-0",
          showConnector && "sm:flex sm:items-stretch sm:gap-3",
          !showConnector && "max-w-xs",
        )}
        role="list"
        aria-labelledby={`${baseId}-summary`}
      >
        <p id={`${baseId}-summary`} className="sr-only">
          {props.title}: {props.points.length} Revisionen
        </p>
        {showConnector ? (
          <div
            className="pointer-events-none absolute start-6 end-6 top-[1.15rem] hidden h-px bg-[var(--sce-surface-border-subtle)] sm:block"
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            "flex flex-col gap-2",
            showConnector && "sm:flex-1 sm:flex-row sm:gap-3",
          )}
        >
          {props.points.map((point, index) => {
            const headline = resolveForecastEvolutionPointHeadline(
              point,
              props.currentBadgeLabel,
            );
            const valueLabel = formatFinanceManagementPlanningMinor(
              point.resultMinor,
              props.currency,
              props.formattingLocale,
            );
            const secondaryMeta = formatForecastEvolutionPointSecondaryMeta({
              point,
              asOfLine: props.formatPointAsOf(point),
              versionLine: props.formatVersionMeta(point.versionNumber),
            });
            const detailSummary = [
              props.tooltipLabels.income,
              formatFinanceManagementPlanningMinor(
                point.incomeMinor,
                props.currency,
                props.formattingLocale,
              ),
              props.tooltipLabels.expense,
              formatFinanceManagementPlanningMinor(
                point.expenseMinor,
                props.currency,
                props.formattingLocale,
              ),
              props.tooltipLabels.result,
              valueLabel,
            ].join(", ");

            return (
              <div
                key={point.forecastVersionId}
                className={cn("min-w-0 flex-1", showConnector && "sm:min-w-[5.5rem]")}
                role="listitem"
              >
                <div
                  className={cn(
                    "relative rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-2)]/30 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                    point.isCurrent && "border-[var(--primary)]/35 bg-[var(--surface-2)]/60",
                  )}
                  tabIndex={0}
                  data-finance-evolution-point={point.isCurrent ? "current" : "historical"}
                  aria-label={`${headline}, ${valueLabel}${secondaryMeta ? `, ${secondaryMeta}` : ""}`}
                >
                  {showConnector ? (
                    <span
                      className={cn(
                        "mb-2 inline-block h-2 w-2 rounded-full ring-2 ring-[var(--surface-1)]",
                        point.isCurrent
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--foreground)]/45",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      point.isCurrent ? "text-[var(--primary)]" : "text-[var(--muted)]",
                    )}
                  >
                    {headline}
                  </p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-[var(--foreground)]">
                    {valueLabel}
                  </p>
                  {secondaryMeta ? (
                    <p className="mt-1 text-[0.65rem] leading-snug text-[var(--muted)]">
                      {secondaryMeta}
                    </p>
                  ) : null}
                  <span className="sr-only">{detailSummary}</span>
                </div>
                {showConnector && index < props.points.length - 1 ? (
                  <div
                    className="my-1 h-3 w-px self-center bg-[var(--sce-surface-border-subtle)] sm:hidden"
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <table className="sr-only">
        <caption>{props.title}</caption>
        <thead>
          <tr>
            <th scope="col">{props.seriesLabel}</th>
            <th scope="col">{props.tooltipLabels.result}</th>
          </tr>
        </thead>
        <tbody>
          {props.points.map((point) => (
            <tr key={point.forecastVersionId}>
              <td>{resolveForecastEvolutionPointHeadline(point, props.currentBadgeLabel)}</td>
              <td>
                {formatFinanceManagementPlanningMinor(
                  point.resultMinor,
                  props.currency,
                  props.formattingLocale,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
