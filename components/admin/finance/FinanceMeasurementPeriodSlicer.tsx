"use client";

import { cn } from "@/lib/cn";
import {
  SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
  SCE_FORM_CONTROL_MICRO_UX_MARKERS,
} from "@/lib/design-system/sce-form-control-micro-ux";
import type {
  FinanceMonthSlicerOption,
  FinanceQuarterSlicerOption,
} from "@/lib/finance/actual/finance-measurement-period-slicer";
import { resolveNextMonthRangeSelection } from "@/lib/finance/actual/finance-measurement-period-slicer";

type MonthSlicerProps = {
  options: FinanceMonthSlicerOption[];
  startIndex: number;
  endIndex: number;
  onRangeChange: (startIndex: number, endIndex: number) => void;
  ariaLabel: string;
  selectedRangeAriaLabel: string;
  disabled?: boolean;
};

type QuarterSlicerProps = {
  options: FinanceQuarterSlicerOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  ariaLabel: string;
  useCompactLabels: boolean;
  disabled?: boolean;
};

const SLICER_SCROLL_CLASS =
  "min-w-0 max-w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:thin]";

const SLICER_ROW_CLASS = "flex w-max min-w-full flex-nowrap gap-1 py-0.5";

function slicerButtonClass(selected: boolean, inRange: boolean): string {
  return cn(
    "shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
    SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
    "disabled:cursor-not-allowed disabled:opacity-50",
    selected
      ? "border-[color-mix(in_srgb,var(--sce-accent)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)] shadow-sm"
      : inRange
        ? "border-[color-mix(in_srgb,var(--sce-accent)_28%,var(--border))] bg-[color-mix(in_srgb,var(--sce-accent)_8%,var(--surface))] text-[var(--foreground)]"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
  );
}

export function FinanceMonthPeriodSlicer({
  options,
  startIndex,
  endIndex,
  onRangeChange,
  ariaLabel,
  selectedRangeAriaLabel,
  disabled = false,
}: MonthSlicerProps) {
  return (
    <div
      className={SLICER_SCROLL_CLASS}
      data-finance-month-slicer
      {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.SEGMENTED_CONTROL]: "true" }}
    >
      <div role="group" aria-label={ariaLabel} className={SLICER_ROW_CLASS}>
        <span className="sr-only">{selectedRangeAriaLabel}</span>
        {options.map((option) => {
          const inRange = option.index >= startIndex && option.index <= endIndex;
          const isEdge = option.index === startIndex || option.index === endIndex;
          return (
            <button
              key={option.index}
              type="button"
              disabled={disabled}
              aria-pressed={inRange}
              aria-current={isEdge && inRange ? "true" : undefined}
              data-finance-month-index={option.index}
              onClick={() => {
                const next = resolveNextMonthRangeSelection({
                  currentStart: startIndex,
                  currentEnd: endIndex,
                  clickedIndex: option.index,
                });
                onRangeChange(next.startIndex, next.endIndex);
              }}
              className={slicerButtonClass(isEdge && inRange, inRange && !isEdge)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FinanceQuarterPeriodSlicer({
  options,
  selectedIndex,
  onSelect,
  ariaLabel,
  useCompactLabels,
  disabled = false,
}: QuarterSlicerProps) {
  return (
    <div
      className={SLICER_SCROLL_CLASS}
      data-finance-quarter-slicer
      {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.SEGMENTED_CONTROL]: "true" }}
    >
      <div role="radiogroup" aria-label={ariaLabel} className={SLICER_ROW_CLASS}>
        {options.map((option) => {
          const selected = option.index === selectedIndex;
          return (
            <button
              key={option.index}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              data-finance-quarter-index={option.index}
              title={option.label}
              onClick={() => onSelect(option.index)}
              className={slicerButtonClass(selected, false)}
            >
              {useCompactLabels ? option.compactLabel : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
