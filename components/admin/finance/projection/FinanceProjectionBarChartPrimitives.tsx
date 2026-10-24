"use client";

import { cn } from "@/lib/cn";

export const FINANCE_PROJECTION_CHART_SURFACE_CLASS =
  "rounded-[var(--sce-radius-md)] border border-[var(--sce-surface-border-subtle)] bg-[var(--sce-surface-dense)] p-3";

export function FinanceProjectionChartLegend(props: {
  items: readonly { key: string; label: string; className: string }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
      {props.items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-sm", item.className)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function FinanceProjectionHorizontalBar(props: {
  label: string;
  valueLabel: string;
  fraction: number;
  barClassName: string;
}) {
  const widthPct = Math.max(0, Math.min(1, props.fraction)) * 100;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-[var(--foreground)]">{props.label}</p>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-[var(--surface-2)]">
          <div
            className={cn("h-full rounded-sm transition-[width]", props.barClassName)}
            style={{ width: `${widthPct}%` }}
          />
        </div>
      </div>
      <span className="tabular-nums text-[var(--muted)]">{props.valueLabel}</span>
    </div>
  );
}
