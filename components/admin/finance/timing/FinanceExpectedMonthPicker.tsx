"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PopoverContent } from "@/components/ui/Popover";
import {
  SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
  SCE_FORM_CONTROL_MICRO_UX_MARKERS,
} from "@/lib/design-system/sce-form-control-micro-ux";
import {
  buildFinanceMonthPickerMonthOptions,
  formatFinanceMonthPickerDisplayValue,
  resolveFinanceMonthPickerYear,
} from "@/lib/finance/forecast/finance-expected-month-picker";

export type FinanceExpectedMonthPickerProps = {
  id?: string;
  value: string;
  onChange: (monthValue: string) => void;
  formattingLocale: string;
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
  yearDecreaseLabel: string;
  yearIncreaseLabel: string;
};

export function FinanceExpectedMonthPicker({
  id,
  value,
  onChange,
  formattingLocale,
  disabled = false,
  placeholder,
  ariaLabel,
  yearDecreaseLabel,
  yearIncreaseLabel,
}: FinanceExpectedMonthPickerProps) {
  const fallbackYear = new Date().getUTCFullYear();
  const listboxId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => resolveFinanceMonthPickerYear(value, fallbackYear));

  const displayValue = value
    ? formatFinanceMonthPickerDisplayValue({ monthValue: value, formattingLocale })
    : "";

  const monthOptions = useMemo(
    () => buildFinanceMonthPickerMonthOptions({ year: pickerYear, formattingLocale }),
    [pickerYear, formattingLocale],
  );

  function selectMonth(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div
      className="min-w-0"
      data-finance-expected-month-picker
      {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.SEGMENTED_CONTROL]: "true" }}
    >
      <button
        ref={anchorRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        className={cn(
          "fca-input flex w-full items-center justify-between text-left",
          SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
          !displayValue && "text-[var(--muted)]",
        )}
        onClick={() => {
          if (disabled) return;
          setPickerYear(resolveFinanceMonthPickerYear(value, fallbackYear));
          setOpen((current) => !current);
        }}
      >
        <span>{displayValue || placeholder}</span>
        <span className="text-xs text-[var(--muted)]" aria-hidden>
          ▾
        </span>
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        role="dialog"
        matchAnchorWidth
        maxHeight={320}
        constrainHeight={false}
        floatingLayer="composer"
      >
        <div className="p-3" data-finance-expected-month-picker-panel>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className={cn(
                "rounded-md border border-[var(--border)] p-1.5 text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
              )}
              aria-label={yearDecreaseLabel}
              onClick={() => setPickerYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">{pickerYear}</span>
            <button
              type="button"
              className={cn(
                "rounded-md border border-[var(--border)] p-1.5 text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
              )}
              aria-label={yearIncreaseLabel}
              onClick={() => setPickerYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="grid grid-cols-2 gap-1 sm:grid-cols-3"
          >
            {monthOptions.map((option) => {
              const selected = value === option.value;
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm",
                      SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS,
                      selected
                        ? "bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--foreground)]"
                        : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                    )}
                    onClick={() => selectMonth(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </div>
  );
}
