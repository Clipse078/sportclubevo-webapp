"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FINANCE_PROJECTION_CHART_SURFACE_CLASS } from "@/components/admin/finance/projection/FinanceProjectionBarChartPrimitives";

type FinanceVisualChartSurfaceProps = {
  title: string;
  description?: string;
  children: ReactNode;
  dataFinanceChart: string;
  className?: string;
};

export function FinanceVisualChartSurface({
  title,
  description,
  children,
  dataFinanceChart,
  className,
}: FinanceVisualChartSurfaceProps) {
  return (
    <div
      className={cn(FINANCE_PROJECTION_CHART_SURFACE_CLASS, "min-w-0", className)}
      data-finance-chart={dataFinanceChart}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-[var(--muted)]">{description}</p>
      ) : null}
      <div className="mt-3 min-w-0">{children}</div>
    </div>
  );
}

export function FinanceVisualLegend(props: {
  items: readonly { key: string; label: string; swatchClassName: string; pattern?: "solid" | "dashed" }[];
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]" aria-hidden>
      {props.items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-3 rounded-sm",
              item.pattern === "dashed" && "border border-dashed bg-transparent",
              item.swatchClassName,
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
