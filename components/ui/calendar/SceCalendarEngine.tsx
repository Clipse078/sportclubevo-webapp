"use client";

import type { ReactNode } from "react";
import MonthActivityGrid from "./MonthActivityGrid";
import type { MonthActivityGridProps } from "./MonthActivityGrid";
import { SCE_CALENDAR_ENGINE_DATA_REGION } from "@/lib/calendar/sce-calendar-engine";

export type SceCalendarEngineProps = MonthActivityGridProps & {
  /** Optional wrapper className (grid shell remains on MonthActivityGrid). */
  className?: string;
  footer?: ReactNode;
};

/**
 * Canonical SCE month calendar shell — shared header, legend, weekday row, and date grid.
 * Scope-specific data adapters populate `days`; filters/toolbars pass via `toolbar`.
 */
export default function SceCalendarEngine({
  className,
  footer,
  cellVariant = "programme",
  ...gridProps
}: SceCalendarEngineProps) {
  return (
    <div
      className={className}
      data-sce-calendar-engine={SCE_CALENDAR_ENGINE_DATA_REGION}
      data-testid="sce-calendar-engine"
    >
      <MonthActivityGrid cellVariant={cellVariant} {...gridProps} />
      {footer}
    </div>
  );
}
