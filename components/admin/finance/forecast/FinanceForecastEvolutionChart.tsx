"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";
import type { ForecastEvolutionChartPoint } from "@/lib/finance/forecast/forecast-evolution-presentation";
import { FINANCE_PROJECTION_CHART_SURFACE_CLASS } from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

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
  formatPointMeta: (point: ForecastEvolutionChartPoint) => string;
};

const CHART_HEIGHT = 168;
const CHART_PAD_X = 24;
const CHART_PAD_Y = 20;

export function FinanceForecastEvolutionChart(props: FinanceForecastEvolutionChartProps) {
  const baseId = useId();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (props.points.length === 0) return null;
    const values = props.points.map((p) => p.resultMinor);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.max(Math.abs(max), 1);
    const width = 640;
    const innerW = width - CHART_PAD_X * 2;
    const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;
    const step = props.points.length > 1 ? innerW / (props.points.length - 1) : 0;

    const coords = props.points.map((point, index) => {
      const x = CHART_PAD_X + (props.points.length > 1 ? step * index : innerW / 2);
      const normalized = (point.resultMinor - min) / span;
      const y = CHART_PAD_Y + innerH - normalized * innerH;
      return { point, x, y, index };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

    return { width, coords, polyline, min, max };
  }, [props.points]);

  if (!layout || props.points.length === 0) {
    return null;
  }

  const activeIndex = focusedIndex ?? layout.coords.findIndex((c) => c.point.isCurrent);
  const active = activeIndex >= 0 ? layout.coords[activeIndex] : layout.coords[layout.coords.length - 1];

  return (
    <div
      className={FINANCE_PROJECTION_CHART_SURFACE_CLASS}
      data-finance-chart="forecast-evolution"
      data-finance-surface="prognoseentwicklung"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {props.title}
      </h3>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{props.seriesLabel}</p>

      <div className="mt-3 min-w-0 overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${CHART_HEIGHT}`}
          className="h-[10.5rem] w-full min-w-[20rem] max-w-full text-[var(--foreground)]"
          role="img"
          aria-labelledby={`${baseId}-summary`}
        >
          <title id={`${baseId}-summary`}>
            {props.title}: {props.points.length} Revisionen
          </title>
          {[0.25, 0.5, 0.75].map((frac) => {
            const y = CHART_PAD_Y + (CHART_HEIGHT - CHART_PAD_Y * 2) * frac;
            return (
              <line
                key={frac}
                x1={CHART_PAD_X}
                x2={layout.width - CHART_PAD_X}
                y1={y}
                y2={y}
                className="stroke-[var(--sce-surface-border-subtle)]"
                strokeWidth={1}
              />
            );
          })}
          <polyline
            fill="none"
            className="stroke-[var(--foreground)]/70"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={layout.polyline}
          />
          {layout.coords.map(({ point, x, y, index }) => {
            const isActive = index === activeIndex;
            const isCurrent = point.isCurrent;
            return (
              <g key={point.forecastVersionId}>
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 6 : 4.5}
                  className={cn(
                    "cursor-pointer transition-[r]",
                    isCurrent
                      ? "fill-[var(--primary)] stroke-[var(--primary)]"
                      : "fill-[var(--surface-1)] stroke-[var(--foreground)]/60",
                    isActive && !isCurrent && "stroke-[var(--foreground)]",
                  )}
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${point.label}, ${formatFinanceManagementPlanningMinor(
                    point.resultMinor,
                    props.currency,
                    props.formattingLocale,
                  )}`}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  onMouseLeave={() => setFocusedIndex(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[0.65rem] text-[var(--muted)]">
        {layout.coords.map(({ point, index }) => (
          <span
            key={point.forecastVersionId}
            className={cn(
              "truncate max-w-[8rem]",
              index === activeIndex && "font-medium text-[var(--foreground)]",
            )}
          >
            {point.isCurrent ? props.currentBadgeLabel : point.label}
          </span>
        ))}
      </div>

      {active ? (
        <div
          className="mt-3 rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--surface-2)]/40 p-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <p className="font-medium text-[var(--foreground)]">
            {active.point.isCurrent ? props.currentBadgeLabel : active.point.label}
            {active.point.revisionLabel ? (
              <span className="ms-2 font-normal text-[var(--muted)]">
                {active.point.revisionLabel}
              </span>
            ) : null}
          </p>
          <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-[var(--muted)]">{props.tooltipLabels.income}</dt>
              <dd className="tabular-nums">
                {formatFinanceManagementPlanningMinor(
                  active.point.incomeMinor,
                  props.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">{props.tooltipLabels.expense}</dt>
              <dd className="tabular-nums">
                {formatFinanceManagementPlanningMinor(
                  active.point.expenseMinor,
                  props.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">{props.tooltipLabels.result}</dt>
              <dd className="tabular-nums font-medium">
                {formatFinanceManagementPlanningMinor(
                  active.point.resultMinor,
                  props.currency,
                  props.formattingLocale,
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-[var(--muted)]">{props.formatPointMeta(active.point)}</p>
        </div>
      ) : null}

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
              <td>{point.label}</td>
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
